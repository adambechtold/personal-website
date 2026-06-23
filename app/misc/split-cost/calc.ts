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

/** Field values may be strings (form input) or numbers (DB rows). */
type Numeric = string | number;

/** Expense-like object accepted by the money-math functions. */
export interface Expense {
  amount: Numeric;
  adam_shares: Numeric;
  matt_shares: Numeric;
  adam_adjustment: Numeric;
  matt_adjustment: Numeric;
  paid_by?: string;
  rate_to_base?: Numeric;
}

export interface Portions {
  adamPortion: number;
  mattPortion: number;
}

export interface Settlement {
  adamPaid: number;
  mattPaid: number;
  adamOwed: number;
  mattOwed: number;
  adamNet: number;
  mattNet: number;
}

/**
 * Computes adam's and matt's portion for a single expense, in the expense's
 * own transaction currency (no FX conversion here).
 *
 * Each adjustment is carved out of the shared pool and handed back to that
 * person, then the remainder is split by shares.
 */
export function computePortions(exp: Expense): Portions {
  const amount = parseFloat(String(exp.amount)) || 0;
  const adamShares = parseInt(String(exp.adam_shares)) || 0;
  const mattShares = parseInt(String(exp.matt_shares)) || 0;
  const adamAdj = parseFloat(String(exp.adam_adjustment)) || 0;
  const mattAdj = parseFloat(String(exp.matt_adjustment)) || 0;
  const totalShares = adamShares + mattShares;
  const remaining = amount - adamAdj - mattAdj;
  let adamPortion =
    totalShares > 0
      ? (adamShares / totalShares) * remaining + adamAdj
      : adamAdj;
  let mattPortion =
    totalShares > 0
      ? (mattShares / totalShares) * remaining + mattAdj
      : mattAdj;
  // Floor the non-payer's portion so the payer absorbs any odd cent.
  if (exp.paid_by === "adam") {
    mattPortion = Math.floor(mattPortion * 100) / 100;
    adamPortion = Math.round((amount - mattPortion) * 100) / 100;
  } else if (exp.paid_by === "matt") {
    adamPortion = Math.floor(adamPortion * 100) / 100;
    mattPortion = Math.round((amount - adamPortion) * 100) / 100;
  }
  return { adamPortion, mattPortion };
}

/**
 * Computes settlement totals across all expenses, converting each expense to
 * USD via its frozen rate_to_base. Returns who paid, who owed, and the net
 * (paid - owed) for each person. A positive net means that person is owed money.
 */
export function computeSettlement(expenses: Expense[]): Settlement {
  let adamPaid = 0;
  let mattPaid = 0;
  let adamOwed = 0;
  let mattOwed = 0;
  for (const exp of expenses) {
    const amount = parseFloat(String(exp.amount)) || 0;
    const rate = parseFloat(String(exp.rate_to_base)) || 1;
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
