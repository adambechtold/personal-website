"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";
import { findTrip } from "./trips";

/**
 * Creates or migrates the expenses table.
 * Phase-1 columns are created via CREATE TABLE IF NOT EXISTS.
 * Phase-2 columns (currency, rate_to_base, rate_date) are added idempotently
 * using ADD COLUMN IF NOT EXISTS, backfilled for legacy USD rows, then made NOT NULL.
 * Phase-3 columns support multiple trips: `trip` scopes a row to a trip slug
 * (legacy rows are all Ireland), and `splits` holds every person's shares and
 * adjustment as JSON (`{"adam": {"shares": 1, "adjustment": 0}, ...}`),
 * backfilled from the legacy two-person adam_/matt_ columns.
 *
 * `splits` is deliberately left nullable: a deployment of the older two-person
 * code inserts rows without it, and the backfill picks those up. The legacy
 * columns are still written (see legacySplitColumns) so that older code keeps
 * reading correct Adam/Matt splits, but `splits` is the only source of truth.
 */
async function migrateSchema() {
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
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS trip   TEXT NOT NULL DEFAULT 'ireland'`;
  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS splits JSONB`;
  await sql`
    UPDATE expenses SET splits = jsonb_build_object(
      'adam', jsonb_build_object('shares', adam_shares, 'adjustment', adam_adjustment),
      'matt', jsonb_build_object('shares', matt_shares, 'adjustment', matt_adjustment)
    )
    WHERE splits IS NULL
  `;
  await sql`ALTER TABLE expenses ALTER COLUMN splits DROP NOT NULL`;
}

// The in-flight or completed migration for this server instance.
let schemaReady = null;

/**
 * Ensures the expenses table exists and is migrated. The migration runs once
 * per server instance rather than before every query; a failed run is
 * forgotten so the next call retries it.
 * @return {Promise<void>}
 */
export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = migrateSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
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
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
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
 * Resolves a trip slug to its trip, throwing for an unknown slug.
 * @param {string} tripSlug - The trip slug.
 * @return {Object} The trip.
 */
function requireTrip(tripSlug) {
  const trip = findTrip(tripSlug);
  if (!trip) throw new Error("Unknown trip");
  return trip;
}

/**
 * Parses raw form input into the fields to persist. The splits are rebuilt
 * from the trip's own people, so unknown people in the input are dropped and
 * missing ones default to zero shares.
 * @param {Object} trip - The trip the expense belongs to.
 * @param {Object} data - Raw expense fields from the form.
 * @return {Object} Parsed paidBy, amount, description, expenseDate, currency,
 *   and splits.
 */
function parseExpense(trip, data) {
  const rawSplits = data.splits || {};
  const splits = {};
  for (const person of trip.people) {
    const rawSplit = rawSplits[person.id] || {};
    splits[person.id] = {
      shares: parseInt(rawSplit.shares) || 0,
      adjustment: parseFloat(rawSplit.adjustment) || 0,
    };
  }
  return {
    paidBy: data.paid_by,
    amount: parseFloat(data.amount),
    description: data.description || "",
    expenseDate: data.expense_date,
    currency: data.currency || "USD",
    splits,
  };
}

/**
 * Derives values for the legacy two-person columns from an expense's splits,
 * so a deployment of the older code still reads the right Adam/Matt split.
 * People who are not on the trip get zero shares.
 * @param {Object} splits - Parsed splits by person id.
 * @return {Object} adamShares, mattShares, adamAdjustment, mattAdjustment.
 */
function legacySplitColumns(splits) {
  const adam = splits.adam || { shares: 0, adjustment: 0 };
  const matt = splits.matt || { shares: 0, adjustment: 0 };
  return {
    adamShares: adam.shares,
    mattShares: matt.shares,
    adamAdjustment: adam.adjustment,
    mattAdjustment: matt.adjustment,
  };
}

/**
 * Validates parsed expense input and throws on invalid data.
 * @param {Object} trip - The trip the expense belongs to.
 * @param {Object} expense - Parsed expense from parseExpense.
 */
function validate(trip, expense) {
  const personIds = trip.people.map((person) => person.id);
  if (!personIds.includes(expense.paidBy)) throw new Error("Invalid paid_by");
  if (isNaN(expense.amount) || expense.amount <= 0) {
    throw new Error("Invalid amount");
  }
  if (!expense.expenseDate) throw new Error("Invalid date");
  if (!trip.currencies.includes(expense.currency)) {
    throw new Error("Invalid currency");
  }
  let totalShares = 0;
  for (const personId of personIds) {
    const shares = expense.splits[personId].shares;
    if (shares < 0) throw new Error("Invalid shares");
    totalShares += shares;
  }
  if (totalShares <= 0) {
    throw new Error("Total shares must be greater than 0");
  }
}

/**
 * Adds a new expense to a trip.
 * @param {string} tripSlug - Slug of the trip the expense belongs to.
 * @param {Object} data - Expense fields.
 * @param {string} data.paid_by
 * @param {string|number} data.amount
 * @param {string} data.description
 * @param {string} data.expense_date
 * @param {string} data.currency
 * @param {Object} data.splits - Per-person `{shares, adjustment}` by person id.
 */
export async function addExpense(tripSlug, data) {
  await requireAuth();
  const trip = requireTrip(tripSlug);
  const expense = parseExpense(trip, data);
  validate(trip, expense);
  const { paidBy, amount, description, expenseDate, currency } = expense;
  const { rateToBase, rateDate } =
    currency === "USD"
      ? { rateToBase: 1, rateDate: expenseDate }
      : await fetchRate(currency, expenseDate);
  const slug = trip.slug;
  const splitsJson = JSON.stringify(expense.splits);
  const legacy = legacySplitColumns(expense.splits);
  await ensureSchema();
  await sql`
    INSERT INTO expenses
      (trip, paid_by, amount, description, expense_date, currency, rate_to_base, rate_date,
       splits, adam_shares, matt_shares, adam_adjustment, matt_adjustment)
    VALUES
      (${slug}, ${paidBy}, ${amount}, ${description}, ${expenseDate}, ${currency}, ${rateToBase}, ${rateDate},
       ${splitsJson}::jsonb, ${legacy.adamShares}, ${legacy.mattShares},
       ${legacy.adamAdjustment}, ${legacy.mattAdjustment})
  `;
  revalidatePath(`/misc/split-cost/${trip.slug}`);
}

/**
 * Updates an existing expense by ID, within its trip.
 * @param {string} tripSlug - Slug of the trip the expense belongs to.
 * @param {number} id - Expense ID.
 * @param {Object} data - Updated expense fields (same shape as addExpense).
 */
export async function updateExpense(tripSlug, id, data) {
  await requireAuth();
  const trip = requireTrip(tripSlug);
  const expense = parseExpense(trip, data);
  validate(trip, expense);
  const { paidBy, amount, description, expenseDate, currency } = expense;
  // Re-derive the rate from currency + date so an edit can never leave a stale
  // or mismatched rate (e.g. when the currency or date itself was changed).
  const { rateToBase, rateDate } =
    currency === "USD"
      ? { rateToBase: 1, rateDate: expenseDate }
      : await fetchRate(currency, expenseDate);
  const legacy = legacySplitColumns(expense.splits);
  await ensureSchema();
  const { rowCount } = await sql`
    UPDATE expenses SET
      paid_by         = ${paidBy},
      amount          = ${amount},
      description     = ${description},
      expense_date    = ${expenseDate},
      currency        = ${currency},
      rate_to_base    = ${rateToBase},
      rate_date       = ${rateDate},
      splits          = ${JSON.stringify(expense.splits)}::jsonb,
      adam_shares     = ${legacy.adamShares},
      matt_shares     = ${legacy.mattShares},
      adam_adjustment = ${legacy.adamAdjustment},
      matt_adjustment = ${legacy.mattAdjustment}
    WHERE id = ${id} AND trip = ${trip.slug}
  `;
  if (rowCount === 0) {
    throw new Error("Expense not found — it may have been deleted.");
  }
  revalidatePath(`/misc/split-cost/${trip.slug}`);
}

/**
 * Deletes an expense by ID, within its trip.
 * @param {string} tripSlug - Slug of the trip the expense belongs to.
 * @param {number} id - Expense ID.
 */
export async function deleteExpense(tripSlug, id) {
  await requireAuth();
  const trip = requireTrip(tripSlug);
  await ensureSchema();
  const { rowCount } =
    await sql`DELETE FROM expenses WHERE id = ${id} AND trip = ${trip.slug}`;
  if (rowCount === 0) {
    throw new Error("Expense not found — it may have already been deleted.");
  }
  revalidatePath(`/misc/split-cost/${trip.slug}`);
}
