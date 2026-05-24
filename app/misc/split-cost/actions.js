"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

/**
 * Creates the expenses table if it does not exist.
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
  const adamShares = parseInt(data.adam_shares) || 0;
  const mattShares = parseInt(data.matt_shares) || 0;
  const adamAdjustment = parseFloat(data.adam_adjustment) || 0;
  const mattAdjustment = parseFloat(data.matt_adjustment) || 0;

  validate(paidBy, amount, expenseDate, adamShares, mattShares);
  await ensureSchema();
  await sql`
    INSERT INTO expenses
      (paid_by, amount, description, expense_date, adam_shares, matt_shares, adam_adjustment, matt_adjustment)
    VALUES
      (${paidBy}, ${amount}, ${description}, ${expenseDate}, ${adamShares}, ${mattShares}, ${adamAdjustment}, ${mattAdjustment})
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
