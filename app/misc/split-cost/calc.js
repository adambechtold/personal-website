/**
 * Pure money-math for the split-cost trip tracker.
 *
 * These functions have no React, DB, or network dependencies so they can be
 * unit-tested in isolation. They are the financial core of the app: every
 * dollar figure a user sees and acts on flows through here.
 *
 * Two invariants must always hold (see TESTING.md, Tier 1):
 *   1. Per-expense conservation:  adamPortion + mattPortion === amount
 *      (guaranteed whenever total shares > 0, which addExpense/updateExpense
 *      enforce at persist time via validate()).
 *   2. Zero-sum settlement:       adamNet + mattNet === 0
 */

/**
 * Computes adam's and matt's portion for a single expense, in the expense's
 * own transaction currency (no FX conversion here).
 *
 * Each adjustment is carved out of the shared pool and handed back to that
 * person, then the remainder is split by shares. Field values may be strings
 * (form input) or numbers (DB rows); both are tolerated.
 *
 * @param {Object} expense - Expense-like object.
 * @param {string|number} expense.amount
 * @param {string|number} expense.adam_shares
 * @param {string|number} expense.matt_shares
 * @param {string|number} expense.adam_adjustment
 * @param {string|number} expense.matt_adjustment
 * @return {{adamPortion: number, mattPortion: number}}
 */
export function computePortions(expense) {
  const amount = parseFloat(expense.amount) || 0;
  const adamShares = parseInt(expense.adam_shares) || 0;
  const mattShares = parseInt(expense.matt_shares) || 0;
  const adamAdjustment = parseFloat(expense.adam_adjustment) || 0;
  const mattAdjustment = parseFloat(expense.matt_adjustment) || 0;
  const totalShares = adamShares + mattShares;
  const remaining = amount - adamAdjustment - mattAdjustment;
  let adamPortion =
    totalShares > 0
      ? (adamShares / totalShares) * remaining + adamAdjustment
      : adamAdjustment;
  let mattPortion =
    totalShares > 0
      ? (mattShares / totalShares) * remaining + mattAdjustment
      : mattAdjustment;
  // Floor the non-payer's portion so the payer absorbs any odd cent.
  if (expense.paid_by === "adam") {
    mattPortion = Math.floor(mattPortion * 100) / 100;
    adamPortion = Math.round((amount - mattPortion) * 100) / 100;
  } else if (expense.paid_by === "matt") {
    adamPortion = Math.floor(adamPortion * 100) / 100;
    mattPortion = Math.round((amount - adamPortion) * 100) / 100;
  }
  return { adamPortion, mattPortion };
}

/**
 * Computes settlement totals across all expenses, converting each expense to
 * USD via its frozen rate_to_base. Returns who paid, who owed, and the net
 * (paid - owed) for each person. A positive net means that person is owed money.
 *
 * @param {Array<Object>} expenses - All expense rows.
 * @return {{
 *   adamPaid: number, mattPaid: number,
 *   adamOwed: number, mattOwed: number,
 *   adamNet: number, mattNet: number
 * }}
 */
export function computeSettlement(expenses) {
  let adamPaid = 0;
  let mattPaid = 0;
  let adamOwed = 0;
  let mattOwed = 0;
  for (const expense of expenses) {
    const amount = parseFloat(expense.amount) || 0;
    const rate = parseFloat(expense.rate_to_base) || 1;
    if (expense.paid_by === "adam") adamPaid += amount * rate;
    else mattPaid += amount * rate;
    const { adamPortion, mattPortion } = computePortions(expense);
    adamOwed += adamPortion * rate;
    mattOwed += mattPortion * rate;
  }
  return {
    adamPaid,
    mattPaid,
    adamOwed,
    mattOwed,
    adamNet: adamPaid - adamOwed,
    mattNet: mattPaid - mattOwed,
  };
}
