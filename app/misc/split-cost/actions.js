"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

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
}

/**
 * Fetches the USD exchange rate for a non-USD currency on a given date.
 * Throws a user-facing error on any failure so nothing is saved with a bad rate.
 * @param {string} currency - ISO 4217 currency code (must not be USD).
 * @param {string} date - YYYY-MM-DD date string.
 * @return {Promise<{rateToBase: number, rateDate: string}>}
 */
async function fetchRate(currency, date) {
  const url = `https://api.frankfurter.dev/v1/${date}?from=${currency}&to=USD`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data.rates?.USD !== "number") {
      throw new Error("Unexpected response shape");
    }
    return { rateToBase: data.rates.USD, rateDate: data.date };
  } catch {
    clearTimeout(timer);
    throw new Error("Couldn't fetch the exchange rate — try again.");
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
  if (adamShares + mattShares <= 0) {
    throw new Error("Total shares must be greater than 0");
  }
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
  const { rateToBase, rateDate } =
    currency === "USD"
      ? { rateToBase: 1, rateDate: expenseDate }
      : await fetchRate(currency, expenseDate);
  await ensureSchema();
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
  const adamShares = parseInt(data.adam_shares) || 0;
  const mattShares = parseInt(data.matt_shares) || 0;
  const adamAdjustment = parseFloat(data.adam_adjustment) || 0;
  const mattAdjustment = parseFloat(data.matt_adjustment) || 0;

  validate(paidBy, amount, expenseDate, adamShares, mattShares);
  // Re-derive the rate from currency + date so an edit can never leave a stale
  // or mismatched rate (e.g. when the currency or date itself was changed).
  const { rateToBase, rateDate } =
    currency === "USD"
      ? { rateToBase: 1, rateDate: expenseDate }
      : await fetchRate(currency, expenseDate);
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
