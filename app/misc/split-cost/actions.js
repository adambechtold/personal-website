"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { buildRateUrl, parseRateResponse, resolveRate } from "./rate-utils";

/**
 * Creates or migrates the expenses table.
 * Phase-1 columns are created via CREATE TABLE IF NOT EXISTS.
 * Phase-2 columns (currency, rate_to_base, rate_date) are added idempotently
 * using ADD COLUMN IF NOT EXISTS, backfilled for legacy USD rows, then made NOT NULL.
 */
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id              SERIAL PRIMARY KEY,
      paid_by         TEXT          NOT NULL,
      amount          NUMERIC(10,2) NOT NULL,
      description     TEXT          NOT NULL DEFAULT '',
      expense_date    DATE          NOT NULL,
      adam_shares     INTEGER       NOT NULL DEFAULT 1,
      matt_shares     INTEGER       NOT NULL DEFAULT 1,
      adam_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
      matt_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency     TEXT`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rate_to_base NUMERIC(14,6)`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rate_date    DATE`;
  await sql`UPDATE expenses SET currency     = 'USD'        WHERE currency     IS NULL`;
  await sql`UPDATE expenses SET rate_to_base = 1            WHERE rate_to_base IS NULL`;
  await sql`UPDATE expenses SET rate_date    = expense_date WHERE rate_date    IS NULL`;
  await sql`ALTER TABLE expenses ALTER COLUMN currency     SET NOT NULL`;
  await sql`ALTER TABLE expenses ALTER COLUMN rate_to_base SET NOT NULL`;
  await sql`ALTER TABLE expenses ALTER COLUMN rate_date    SET NOT NULL`;
  // Daily rate cache, keyed by the requested expense date (as_of_date). rate_date
  // is the actual market date the rate is from, which may differ on weekends/holidays.
  await sql`
    CREATE TABLE IF NOT EXISTS rates (
      currency      TEXT          NOT NULL,
      as_of_date    DATE          NOT NULL,
      rate_date     DATE          NOT NULL,
      rate_to_base  NUMERIC(14,6) NOT NULL,
      fetched_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
      PRIMARY KEY (currency, as_of_date)
    )
  `;
}

/**
 * Fetches the USD exchange rate for a currency on a given date.
 * Returns {rate_to_base: 1, rate_date: date} immediately for USD.
 * Throws a user-facing error on any failure so nothing is saved with a bad rate.
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD date string.
 * @return {Promise<{rate_to_base: number, rate_date: string}>}
 */
async function fetchRate(currency, date) {
  if (currency === "USD") return { rateToBase: 1, rateDate: date };
  const url = buildRateUrl(currency, date);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseRateResponse(await res.json());
  } catch {
    clearTimeout(timer);
    throw new Error("Couldn't fetch the exchange rate — try again.");
  }
}

/**
 * Reads a cached rate for a currency on a requested date.
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD requested (expense) date.
 * @return {Promise<?{rateToBase: number, rateDate: string}>} Cached rate or null on miss.
 */
async function readRateCache(currency, date) {
  const { rows } = await sql`
    SELECT rate_to_base, rate_date FROM rates
    WHERE currency = ${currency} AND as_of_date = ${date}
  `;
  if (!rows.length) return null;
  const row = rows[0];
  const rateDate =
    row.rate_date instanceof Date
      ? row.rate_date.toISOString().slice(0, 10)
      : String(row.rate_date).slice(0, 10);
  return { rateToBase: parseFloat(row.rate_to_base), rateDate };
}

/**
 * Writes a fetched rate into the cache. Concurrent prefetch + add races are
 * harmless: the first write wins via ON CONFLICT DO NOTHING.
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD requested (expense) date.
 * @param {{rateToBase: number, rateDate: string}} rate - The fetched rate.
 * @return {Promise<void>}
 */
async function writeRateCache(currency, date, { rateToBase, rateDate }) {
  await sql`
    INSERT INTO rates (currency, as_of_date, rate_date, rate_to_base)
    VALUES (${currency}, ${date}, ${rateDate}, ${rateToBase})
    ON CONFLICT (currency, as_of_date) DO NOTHING
  `;
}

/**
 * Cache-first rate lookup used by both prefetch and expense writes.
 * Assumes the schema already exists (call ensureSchema first).
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD expense date.
 * @return {Promise<{rateToBase: number, rateDate: string}>}
 */
function getRate(currency, date) {
  return resolveRate(currency, date, {
    readCache: readRateCache,
    writeCache: writeRateCache,
    fetchRate,
  });
}

/**
 * Warms the rate cache for a currency/date without writing an expense.
 * Called from the client on page load and when the date input changes so the
 * subsequent add is instant. No-ops for USD. Errors are intentionally swallowed —
 * a failed prefetch just means the add path will fetch on demand.
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD expense date.
 * @return {Promise<void>}
 */
export async function ensureRate(currency, date) {
  if (!currency || currency === "USD" || !date) return;
  try {
    await ensureSchema();
    await getRate(currency, date);
  } catch {
    // Best-effort warm-up; the add path will retry the fetch if needed.
  }
}

/**
 * Validates expense input and throws on invalid data.
 * @param {string} paidBy - Who paid ('adam' or 'matt').
 * @param {number} amount - Expense amount.
 * @param {string} expenseDate - Date string (YYYY-MM-DD).
 * @param {number} adamShares - Adam's share count.
 * @param {number} mattShares - Matt's share count.
 */
function validate(paidBy, amount, expenseDate, adamShares, mattShares) {
  if (!["adam", "matt"].includes(paidBy)) throw new Error("Invalid paid_by");
  if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
  if (!expenseDate) throw new Error("Invalid date");
  if (adamShares < 0 || mattShares < 0) throw new Error("Invalid shares");
}

/**
 * Adds a new expense to the database.
 * @param {Object} data - Expense fields.
 * @param {string} data.paid_by
 * @param {string|number} data.amount
 * @param {string} data.description
 * @param {string} data.expense_date
 * @param {string} data.currency
 * @param {string|number} data.adam_shares
 * @param {string|number} data.matt_shares
 * @param {string|number} data.adam_adjustment
 * @param {string|number} data.matt_adjustment
 */
export async function addExpense(data) {
  const paidBy = data.paid_by;
  const amount = parseFloat(data.amount);
  const description = data.description || "";
  const expenseDate = data.expense_date;
  const currency = data.currency || "USD";
  const adamShares = parseInt(data.adam_shares) || 0;
  const mattShares = parseInt(data.matt_shares) || 0;
  const adamAdjustment = parseFloat(data.adam_adjustment) || 0;
  const mattAdjustment = parseFloat(data.matt_adjustment) || 0;

  validate(paidBy, amount, expenseDate, adamShares, mattShares);
  await ensureSchema();
  const { rateToBase, rateDate } = await getRate(currency, expenseDate);
  await sql`
    INSERT INTO expenses
      (paid_by, amount, description, expense_date, currency, rate_to_base, rate_date,
       adam_shares, matt_shares, adam_adjustment, matt_adjustment)
    VALUES
      (${paidBy}, ${amount}, ${description}, ${expenseDate}, ${currency}, ${rateToBase}, ${rateDate},
       ${adamShares}, ${mattShares}, ${adamAdjustment}, ${mattAdjustment})
  `;
  revalidatePath("/misc/split-cost");
}

/**
 * Updates an existing expense by ID.
 * @param {number} id - Expense ID.
 * @param {Object} data - Updated expense fields.
 * @param {string} data.paid_by
 * @param {string|number} data.amount
 * @param {string} data.description
 * @param {string} data.expense_date
 * @param {string} data.currency
 * @param {string|number} data.adam_shares
 * @param {string|number} data.matt_shares
 * @param {string|number} data.adam_adjustment
 * @param {string|number} data.matt_adjustment
 */
export async function updateExpense(id, data) {
  const paidBy = data.paid_by;
  const amount = parseFloat(data.amount);
  const description = data.description || "";
  const expenseDate = data.expense_date;
  const currency = data.currency || "USD";
  const rateToBase = parseFloat(data.rate_to_base) || 1;
  const rateDate = data.rate_date || expenseDate;
  const adamShares = parseInt(data.adam_shares) || 0;
  const mattShares = parseInt(data.matt_shares) || 0;
  const adamAdjustment = parseFloat(data.adam_adjustment) || 0;
  const mattAdjustment = parseFloat(data.matt_adjustment) || 0;

  validate(paidBy, amount, expenseDate, adamShares, mattShares);
  await ensureSchema();
  await sql`
    UPDATE expenses SET
      paid_by         = ${paidBy},
      amount          = ${amount},
      description     = ${description},
      expense_date    = ${expenseDate},
      currency        = ${currency},
      rate_to_base    = ${rateToBase},
      rate_date       = ${rateDate},
      adam_shares     = ${adamShares},
      matt_shares     = ${mattShares},
      adam_adjustment = ${adamAdjustment},
      matt_adjustment = ${mattAdjustment}
    WHERE id = ${id}
  `;
  revalidatePath("/misc/split-cost");
}

/**
 * Deletes an expense by ID.
 * @param {number} id - Expense ID.
 */
export async function deleteExpense(id) {
  await ensureSchema();
  await sql`DELETE FROM expenses WHERE id = ${id}`;
  revalidatePath("/misc/split-cost");
}
