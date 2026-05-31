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
 * @param {Object} exp - Expense-like object.
 * @param {string|number} exp.amount
 * @param {string|number} exp.adam_shares
 * @param {string|number} exp.matt_shares
 * @param {string|number} exp.adam_adjustment
 * @param {string|number} exp.matt_adjustment
 * @return {{adamPortion: number, mattPortion: number}}
 */
export function computePortions(exp) {
  const amount = parseFloat(exp.amount) || 0;
  const adamShares = parseInt(exp.adam_shares) || 0;
  const mattShares = parseInt(exp.matt_shares) || 0;
  const adamAdj = parseFloat(exp.adam_adjustment) || 0;
  const mattAdj = parseFloat(exp.matt_adjustment) || 0;
  const totalShares = adamShares + mattShares;
  const remaining = amount - adamAdj - mattAdj;
  const adamPortion =
    totalShares > 0
      ? (adamShares / totalShares) * remaining + adamAdj
      : adamAdj;
  const mattPortion =
    totalShares > 0
      ? (mattShares / totalShares) * remaining + mattAdj
      : mattAdj;
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
  for (const exp of expenses) {
    const amount = parseFloat(exp.amount) || 0;
    const rate = parseFloat(exp.rate_to_base) || 1;
    if (exp.paid_by === "adam") adamPaid += amount * rate;
    else mattPaid += amount * rate;
    const { adamPortion, mattPortion } = computePortions(exp);
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
