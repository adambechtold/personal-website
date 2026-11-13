/**
 * Pure money-math for the split-cost trip tracker.
 *
 * These functions have no React, DB, or network dependencies so they can be
 * unit-tested in isolation. They are the financial core of the app: every
 * dollar figure a user sees and acts on flows through here.
 *
 * An expense carries a `splits` object keyed by person id, one entry per
 * person on the trip: `{ adam: { shares: 1, adjustment: 0 }, ... }`.
 *
 * Two invariants must always hold (see TESTING.md, Tier 1):
 *   1. Per-expense conservation:  the portions sum to the expense amount
 *      (guaranteed whenever total shares > 0, which addExpense/updateExpense
 *      enforce at persist time via validate()).
 *   2. Zero-sum settlement:       everyone's net balances sum to 0
 */

/**
 * Computes each person's portion of a single expense, in the expense's own
 * transaction currency (no FX conversion here).
 *
 * Each adjustment is carved out of the shared pool and handed back to that
 * person, then the remainder is split by shares. Field values may be strings
 * (form input) or numbers (DB rows); both are tolerated.
 *
 * When `paid_by` names one of the people, every other person's portion is
 * floored to the cent and the payer absorbs the odd cents. Without a payer the
 * raw, unrounded portions are returned.
 *
 * @param {Object} expense - Expense-like object.
 * @param {string|number} expense.amount
 * @param {string} [expense.paid_by]
 * @param {Object} expense.splits - `{shares, adjustment}` per person id.
 * @return {Object<string, number>} Portion per person id.
 */
export function computePortions(expense) {
  const amount = parseFloat(expense.amount) || 0;
  const splits = expense.splits || {};
  const personIds = Object.keys(splits);

  let totalShares = 0;
  let totalAdjustments = 0;
  for (const personId of personIds) {
    totalShares += parseInt(splits[personId].shares) || 0;
    totalAdjustments += parseFloat(splits[personId].adjustment) || 0;
  }
  const remaining = amount - totalAdjustments;

  const portions = {};
  for (const personId of personIds) {
    const shares = parseInt(splits[personId].shares) || 0;
    const adjustment = parseFloat(splits[personId].adjustment) || 0;
    portions[personId] =
      totalShares > 0
        ? (shares / totalShares) * remaining + adjustment
        : adjustment;
  }

  // Floor every non-payer's portion so the payer absorbs any odd cents. The
  // tiny epsilon keeps exact-cent values (e.g. 0.29 * 100 = 28.999…) from
  // being floored a whole cent too low.
  const payerId = expense.paid_by;
  if (personIds.includes(payerId)) {
    let othersTotalCents = 0;
    for (const personId of personIds) {
      if (personId === payerId) continue;
      const cents = Math.floor(portions[personId] * 100 + 1e-6);
      portions[personId] = cents / 100;
      othersTotalCents += cents;
    }
    portions[payerId] = (Math.round(amount * 100) - othersTotalCents) / 100;
  }
  return portions;
}

/**
 * Computes settlement totals across all expenses, converting each expense to
 * USD via its frozen rate_to_base. Returns, for each person, what they paid,
 * what they owed, and the net (paid - owed). A positive net means that person
 * is owed money.
 *
 * @param {Array<Object>} expenses - All expense rows for one trip.
 * @param {Array<string>} personIds - Ids of everyone on the trip.
 * @return {Object<string, {paid: number, owed: number, net: number}>}
 */
export function computeSettlement(expenses, personIds) {
  const settlement = {};
  for (const personId of personIds) {
    settlement[personId] = { paid: 0, owed: 0, net: 0 };
  }
  for (const expense of expenses) {
    const amount = parseFloat(expense.amount) || 0;
    const rate = parseFloat(expense.rate_to_base) || 1;
    if (settlement[expense.paid_by]) {
      settlement[expense.paid_by].paid += amount * rate;
    }
    const portions = computePortions(expense);
    for (const personId of personIds) {
      settlement[personId].owed += (portions[personId] || 0) * rate;
    }
  }
  for (const personId of personIds) {
    settlement[personId].net =
      settlement[personId].paid - settlement[personId].owed;
  }
  return settlement;
}

/**
 * Turns per-person net balances into a short list of payments that settles
 * everyone up: repeatedly, the person who owes the most pays the person who is
 * owed the most. Works in whole cents; balances under one cent are ignored.
 *
 * Rounding each person's net to the cent independently can leave the rounded
 * balances a cent or two away from summing to zero. That residue is folded
 * into the largest balance so the payments always settle every balance.
 *
 * @param {Object<string, {net: number}>} settlement - From computeSettlement.
 * @return {Array<{from: string, to: string, amount: number}>} Payments in USD.
 */
export function computeTransfers(settlement) {
  const balances = Object.entries(settlement).map(([personId, totals]) => ({
    personId,
    cents: Math.round(totals.net * 100),
  }));
  const residueCents = balances.reduce(
    (total, balance) => total + balance.cents,
    0
  );
  if (residueCents !== 0) {
    const largest = balances.reduce((current, balance) =>
      Math.abs(balance.cents) > Math.abs(current.cents) ? balance : current
    );
    largest.cents -= residueCents;
  }
  const transfers = [];
  for (;;) {
    let debtor = null;
    let creditor = null;
    for (const balance of balances) {
      if (balance.cents < 0 && (!debtor || balance.cents < debtor.cents)) {
        debtor = balance;
      }
      if (balance.cents > 0 && (!creditor || balance.cents > creditor.cents)) {
        creditor = balance;
      }
    }
    if (!debtor || !creditor) break;
    const cents = Math.min(-debtor.cents, creditor.cents);
    debtor.cents += cents;
    creditor.cents -= cents;
    transfers.push({
      from: debtor.personId,
      to: creditor.personId,
      amount: cents / 100,
    });
  }
  return transfers;
}
