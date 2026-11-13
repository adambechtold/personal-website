import { describe, it, expect } from "vitest";
import { computePortions, computeSettlement, computeTransfers } from "./calc";

/**
 * The two-person tests below were written against the original Adam & Matt
 * shape (adam_shares / matt_shares / ...). These helpers translate that shape
 * into the generalized `splits` shape so the same cases keep guarding the
 * generalized math.
 */

/**
 * Converts a legacy two-person expense into the `splits` shape.
 * @param {Object} legacyExpense - Expense with adam_/matt_ fields.
 * @return {Object} Expense with a `splits` object.
 */
function twoPersonExpense(legacyExpense) {
  const {
    adam_shares: adamShares,
    matt_shares: mattShares,
    adam_adjustment: adamAdjustment,
    matt_adjustment: mattAdjustment,
    ...rest
  } = legacyExpense;
  return {
    ...rest,
    splits: {
      adam: { shares: adamShares, adjustment: adamAdjustment },
      matt: { shares: mattShares, adjustment: mattAdjustment },
    },
  };
}

/**
 * computePortions for a legacy two-person expense.
 * @param {Object} legacyExpense - Expense with adam_/matt_ fields.
 * @return {{adamPortion: number, mattPortion: number}}
 */
function twoPersonPortions(legacyExpense) {
  const portions = computePortions(twoPersonExpense(legacyExpense));
  return { adamPortion: portions.adam, mattPortion: portions.matt };
}

/**
 * computeSettlement for legacy two-person expenses.
 * @param {Array<Object>} legacyExpenses - Expenses with adam_/matt_ fields.
 * @return {Object} Flat adam/matt paid, owed, and net totals.
 */
function twoPersonSettlement(legacyExpenses) {
  const settlement = computeSettlement(legacyExpenses.map(twoPersonExpense), [
    "adam",
    "matt",
  ]);
  return {
    adamPaid: settlement.adam.paid,
    mattPaid: settlement.matt.paid,
    adamOwed: settlement.adam.owed,
    mattOwed: settlement.matt.owed,
    adamNet: settlement.adam.net,
    mattNet: settlement.matt.net,
  };
}

/**
 * GOLDEN PATTERN — Tier 1 (pure money-math).
 *
 * Copy the style of these tests. They assert the two prime invariants from
 * TESTING.md plus a couple of concrete cases. No DB, no network, no React.
 * Run with:  npm run test:unit
 */

describe("computePortions", () => {
  it("should split evenly with equal shares and no adjustments", () => {
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100.00",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(50, 10);
    expect(mattPortion).toBeCloseTo(50, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  it("should split by uneven shares", () => {
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "90",
      adam_shares: "2",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(60, 10);
    expect(mattPortion).toBeCloseTo(30, 10);
  });

  it("should carve out an adjustment and split the remainder", () => {
    // Adam had a $20 personal item; the remaining $80 splits 1:1.
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "20",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(60, 10); // 40 share + 20 adjustment
    expect(mattPortion).toBeCloseTo(40, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  it("should conserve the full amount across thousands of random valid expenses", () => {
    for (let i = 0; i < 2000; i++) {
      const amount = Math.round(Math.random() * 1_000_000) / 100; // up to $10k, 2dp
      const adamShares = Math.floor(Math.random() * 10);
      // ensure total shares > 0, which validate() enforces at persist time
      const mattShares =
        Math.floor(Math.random() * 10) + (adamShares === 0 ? 1 : 0);
      const adamAdjustment = Math.round((Math.random() - 0.5) * 4000) / 100;
      const mattAdjustment = Math.round((Math.random() - 0.5) * 4000) / 100;
      const { adamPortion, mattPortion } = twoPersonPortions({
        amount,
        adam_shares: adamShares,
        matt_shares: mattShares,
        adam_adjustment: adamAdjustment,
        matt_adjustment: mattAdjustment,
      });
      expect(adamPortion + mattPortion).toBeCloseTo(amount, 6);
    }
  });

  // adjustment edge cases
  it("should conserve the full amount when an adjustment exceeds the total", () => {
    // amount=10, adamAdj=15 → remaining=-5; adam=-2.5+15=12.5, matt=-2.5; sum=10
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "10",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "15",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(12.5, 10);
    expect(mattPortion).toBeCloseTo(-2.5, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(10, 10);
  });

  it("should conserve the full amount with a negative adjustment", () => {
    // adamAdj=-10 → remaining=110; adam=55-10=45, matt=55; sum=100
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "-10",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(45, 10);
    expect(mattPortion).toBeCloseTo(55, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  it("should conserve the full amount when adjustments consume the entire expense", () => {
    // all money is pre-carved; remaining=0 so shares add nothing
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "60",
      matt_adjustment: "40",
    });
    expect(adamPortion).toBeCloseTo(60, 10);
    expect(mattPortion).toBeCloseTo(40, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  it("should conserve the full amount when both adjustments are negative", () => {
    // both negative → remaining > amount; sum must still equal amount
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "-20",
      matt_adjustment: "-10",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  // When paid_by is absent (e.g. in-form cost preview), no rounding is applied
  // and raw floats are returned. Conservation still holds at float precision.
  it("should return raw portions that sum to the full amount for a sub-cent 1:1 split", () => {
    // each person gets 0.005 as a raw float; no payer rounding applied
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "0.01",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("should return raw portions that sum to the full amount for a sub-cent 1:2 split", () => {
    // adam gets 0.00333…, matt gets 0.00666…; sum = 0.01
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "0.01",
      adam_shares: "1",
      matt_shares: "2",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  // Payer-pays-the-extra-cent rounding policy.
  // When paid_by is set, the non-payer's portion is floored to the nearest cent
  // and the payer's portion is the exact remainder, so the payer absorbs any
  // odd cent rather than passing it to the other person.
  it("should give the payer the extra cent when adam paid", () => {
    // raw portions are $0.005 each; Matt (non-payer) floors to $0.00; Adam gets $0.01
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "0.01",
      paid_by: "adam",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(0.01, 10);
    expect(mattPortion).toBeCloseTo(0.0, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("should give the payer the extra cent when matt paid", () => {
    // Adam (non-payer) floors to $0.00; Matt gets $0.01
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "0.01",
      paid_by: "matt",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(mattPortion).toBeCloseTo(0.01, 10);
    expect(adamPortion).toBeCloseTo(0.0, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("should not alter portions that divide evenly to the cent", () => {
    // $100 split 1:1 divides exactly; no rounding needed regardless of payer
    const { adamPortion, mattPortion } = twoPersonPortions({
      amount: "100.00",
      paid_by: "adam",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(50, 10);
    expect(mattPortion).toBeCloseTo(50, 10);
  });

  it("should conserve the full amount across hundreds of random cent inputs when paid_by is set", () => {
    for (let i = 0; i < 500; i++) {
      // Use whole-cent amounts (input data is always in cents per validate())
      const cents = Math.floor(Math.random() * 100000);
      const amount = cents / 100;
      const payer = Math.random() < 0.5 ? "adam" : "matt";
      const adamShares = Math.floor(Math.random() * 5) + 1;
      const mattShares = Math.floor(Math.random() * 5) + 1;
      const { adamPortion, mattPortion } = twoPersonPortions({
        amount,
        paid_by: payer,
        adam_shares: adamShares,
        matt_shares: mattShares,
        adam_adjustment: "0",
        matt_adjustment: "0",
      });
      expect(adamPortion + mattPortion).toBeCloseTo(amount, 2);
    }
  });
});

describe("computeSettlement", () => {
  it("should return all zeros for an empty expense list", () => {
    const s = twoPersonSettlement([]);
    expect(s).toEqual({
      adamPaid: 0,
      mattPaid: 0,
      adamOwed: 0,
      mattOwed: 0,
      adamNet: 0,
      mattNet: 0,
    });
  });

  it("should produce a zero-sum settlement where adamNet equals negative mattNet", () => {
    const expenses = [
      {
        paid_by: "adam",
        amount: "100",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
      {
        paid_by: "matt",
        amount: "40",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    // Adam paid 100, owes 70; Matt paid 40, owes 70. Matt owes Adam 30.
    expect(s.adamNet).toBeCloseTo(30, 10);
    expect(s.mattNet).toBeCloseTo(-30, 10);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
  });

  it("should convert each expense to USD using its own rate_to_base", () => {
    const expenses = [
      {
        paid_by: "matt",
        amount: "50", // 50 EUR
        rate_to_base: "1.1", // 1 EUR = $1.10
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.mattPaid).toBeCloseTo(55, 10); // 50 * 1.1
    expect(s.adamOwed).toBeCloseTo(27.5, 10);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
  });

  it("should remain zero-sum across a mixed-currency expense list", () => {
    // EUR + GBP expenses; each must use its own rate, and the net must still cancel
    const expenses = [
      {
        paid_by: "adam",
        amount: "100", // 100 EUR at 1.10 → 110 USD
        rate_to_base: "1.10",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
      {
        paid_by: "matt",
        amount: "50", // 50 GBP at 1.30 → 65 USD
        rate_to_base: "1.30",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
    expect(s.adamNet).toBeCloseTo(-s.mattNet, 10);
  });

  it("should return a positive adamNet when Adam overpaid so Matt owes Adam", () => {
    // Adam paid 100, each owes 50 → adamNet = 50 > 0
    const expenses = [
      {
        paid_by: "adam",
        amount: "100",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.adamNet).toBeGreaterThan(0);
    expect(s.adamNet).toBeCloseTo(50, 10);
  });

  it("should return a negative adamNet when Matt overpaid so Adam owes Matt", () => {
    // Matt paid 100, each owes 50 → adamNet = 0 - 50 = -50 < 0
    const expenses = [
      {
        paid_by: "matt",
        amount: "100",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.adamNet).toBeLessThan(0);
    expect(s.adamNet).toBeCloseTo(-50, 10);
  });

  it("should return adamNet within the settled threshold when expenses exactly balance", () => {
    // Each person pays $50 and owes $50 → adamNet = 0 → within settled threshold
    const expenses = [
      {
        paid_by: "adam",
        amount: "50",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
      {
        paid_by: "matt",
        amount: "50",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(Math.abs(s.adamNet)).toBeLessThan(0.01);
  });

  it("should apply each expense's own rate_to_base independently", () => {
    // Two expenses at very different rates; adamPaid and mattPaid must reflect per-row rates
    const expenses = [
      {
        paid_by: "adam",
        amount: "100", // 100 × 2.0 = 200 USD
        rate_to_base: "2.0",
        adam_shares: "1",
        matt_shares: "0",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
      {
        paid_by: "matt",
        amount: "100", // 100 × 0.5 = 50 USD
        rate_to_base: "0.5",
        adam_shares: "0",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.adamPaid).toBeCloseTo(200, 10);
    expect(s.mattPaid).toBeCloseTo(50, 10);
  });

  it("should pass a USD expense through unchanged with rate 1", () => {
    const expenses = [
      {
        paid_by: "adam",
        amount: "75",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const s = twoPersonSettlement(expenses);
    expect(s.adamPaid).toBeCloseTo(75, 10); // 75 * 1 = 75, unchanged
    expect(s.adamOwed).toBeCloseTo(37.5, 10);
    expect(s.mattOwed).toBeCloseTo(37.5, 10);
  });

  it("should produce identical results when run twice on the same expense rows", () => {
    const expenses = [
      {
        paid_by: "adam",
        amount: "87.50",
        rate_to_base: "1.15",
        adam_shares: "2",
        matt_shares: "1",
        adam_adjustment: "5",
        matt_adjustment: "0",
      },
      {
        paid_by: "matt",
        amount: "40",
        rate_to_base: "1",
        adam_shares: "1",
        matt_shares: "1",
        adam_adjustment: "0",
        matt_adjustment: "0",
      },
    ];
    const first = twoPersonSettlement(expenses);
    const second = twoPersonSettlement(expenses);
    expect(second.adamNet).toBe(first.adamNet);
    expect(second.mattNet).toBe(first.mattNet);
    expect(second.adamPaid).toBe(first.adamPaid);
    expect(second.mattPaid).toBe(first.mattPaid);
    expect(second.adamOwed).toBe(first.adamOwed);
    expect(second.mattOwed).toBe(first.mattOwed);
  });

  it("should not leak cents across many accumulated sub-cent expenses", () => {
    // 100 × $0.01 paid by adam, split 1:1
    // Payer-pays-extra-cent: each expense → adam portion $0.01, matt portion $0.00
    // adamPaid=1.00, adamOwed=1.00, mattOwed=0.00 → adamNet=0.00 (they're even)
    const expenses = Array.from({ length: 100 }, () => ({
      paid_by: "adam",
      amount: "0.01",
      rate_to_base: "1",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    }));
    const s = twoPersonSettlement(expenses);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
    expect(s.adamNet).toBeCloseTo(0.0, 10);
  });
});

const FOUR_PEOPLE = ["adam", "adela", "tia", "chris"];

/**
 * Builds a four-person expense with the given shares (adjustments default 0).
 * @param {Object} fields - amount, paid_by, rate_to_base, etc.
 * @param {Array<number>} shares - Shares in FOUR_PEOPLE order.
 * @param {Array<number>} [adjustments] - Adjustments in FOUR_PEOPLE order.
 * @return {Object} The expense.
 */
function fourPersonExpense(fields, shares, adjustments = [0, 0, 0, 0]) {
  const splits = {};
  FOUR_PEOPLE.forEach((personId, personIndex) => {
    splits[personId] = {
      shares: shares[personIndex],
      adjustment: adjustments[personIndex],
    };
  });
  return { rate_to_base: 1, ...fields, splits };
}

/**
 * Sums the values of an object.
 * @param {Object<string, number>} values
 * @return {number}
 */
function sumValues(values) {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

describe("computePortions with four people", () => {
  it("should split evenly four ways", () => {
    const portions = computePortions(
      fourPersonExpense({ amount: "100", paid_by: "tia" }, [1, 1, 1, 1])
    );
    expect(portions).toEqual({ adam: 25, adela: 25, tia: 25, chris: 25 });
  });

  it("should leave out a person with zero shares", () => {
    const portions = computePortions(
      fourPersonExpense({ amount: "90", paid_by: "adam" }, [1, 1, 1, 0])
    );
    expect(portions).toEqual({ adam: 30, adela: 30, tia: 30, chris: 0 });
  });

  it("should have the payer absorb the odd cents", () => {
    const portions = computePortions(
      fourPersonExpense({ amount: "10.03", paid_by: "chris" }, [1, 1, 1, 1])
    );
    expect(portions).toEqual({ adam: 2.5, adela: 2.5, tia: 2.5, chris: 2.53 });
  });

  it("should not floor an exact-cent portion a cent too low", () => {
    // 1.16 / 4 = 0.29, and 0.29 * 100 is 28.999… in floating point.
    const portions = computePortions(
      fourPersonExpense({ amount: "1.16", paid_by: "adam" }, [1, 1, 1, 1])
    );
    expect(portions).toEqual({
      adam: 0.29,
      adela: 0.29,
      tia: 0.29,
      chris: 0.29,
    });
  });

  it("should carve out an adjustment before splitting", () => {
    // Adela had a $20 personal item; the remaining $80 splits four ways.
    const portions = computePortions(
      fourPersonExpense(
        { amount: "100", paid_by: "adam" },
        [1, 1, 1, 1],
        [0, 20, 0, 0]
      )
    );
    expect(portions).toEqual({ adam: 20, adela: 40, tia: 20, chris: 20 });
  });

  it("should conserve the full amount to the cent across random expenses", () => {
    for (let iteration = 0; iteration < 2000; iteration++) {
      const amountCents = Math.floor(Math.random() * 1_000_000) + 1;
      const shares = FOUR_PEOPLE.map(() => Math.floor(Math.random() * 4));
      if (shares.every((share) => share === 0)) shares[0] = 1;
      const adjustments = FOUR_PEOPLE.map(
        () => Math.round((Math.random() - 0.5) * 4000) / 100
      );
      const payer = FOUR_PEOPLE[Math.floor(Math.random() * 4)];
      const portions = computePortions(
        fourPersonExpense(
          { amount: (amountCents / 100).toFixed(2), paid_by: payer },
          shares,
          adjustments
        )
      );
      const totalCents = Object.values(portions).reduce(
        (total, portion) => total + Math.round(portion * 100),
        0
      );
      expect(totalCents).toBe(amountCents);
    }
  });
});

describe("computeSettlement with four people", () => {
  it("should return zeros for everyone on an empty list", () => {
    const settlement = computeSettlement([], FOUR_PEOPLE);
    for (const personId of FOUR_PEOPLE) {
      expect(settlement[personId]).toEqual({ paid: 0, owed: 0, net: 0 });
    }
  });

  it("should be zero-sum across mixed payers, shares, and currencies", () => {
    const expenses = [
      fourPersonExpense({ amount: "100", paid_by: "adam" }, [1, 1, 1, 1]),
      fourPersonExpense(
        { amount: "5000", paid_by: "adela", rate_to_base: "0.0172" },
        [1, 1, 0, 2]
      ),
      fourPersonExpense(
        { amount: "33.33", paid_by: "chris" },
        [1, 1, 1, 1],
        [5, 0, 0, -2]
      ),
    ];
    const settlement = computeSettlement(expenses, FOUR_PEOPLE);
    const nets = {};
    for (const personId of FOUR_PEOPLE)
      nets[personId] = settlement[personId].net;
    expect(sumValues(nets)).toBeCloseTo(0, 8);
    expect(settlement.adam.paid).toBeCloseTo(100, 10);
    expect(settlement.adela.paid).toBeCloseTo(86, 10);
    expect(settlement.tia.paid).toBe(0);
  });

  it("should credit the payer and debit everyone else", () => {
    const settlement = computeSettlement(
      [fourPersonExpense({ amount: "100", paid_by: "adam" }, [1, 1, 1, 1])],
      FOUR_PEOPLE
    );
    expect(settlement.adam.net).toBeCloseTo(75, 10);
    expect(settlement.adela.net).toBeCloseTo(-25, 10);
    expect(settlement.tia.net).toBeCloseTo(-25, 10);
    expect(settlement.chris.net).toBeCloseTo(-25, 10);
  });
});

describe("computeTransfers", () => {
  it("should return no transfers when everyone is settled", () => {
    expect(computeTransfers(computeSettlement([], FOUR_PEOPLE))).toEqual([]);
    expect(
      computeTransfers({ adam: { net: 0.004 }, matt: { net: -0.004 } })
    ).toEqual([]);
  });

  it("should have each debtor pay the single creditor", () => {
    const transfers = computeTransfers({
      adam: { net: 75 },
      adela: { net: -25 },
      tia: { net: -25 },
      chris: { net: -25 },
    });
    expect(transfers).toEqual([
      { from: "adela", to: "adam", amount: 25 },
      { from: "tia", to: "adam", amount: 25 },
      { from: "chris", to: "adam", amount: 25 },
    ]);
  });

  it("should produce the two-person owes line", () => {
    expect(
      computeTransfers({ adam: { net: -12.34 }, matt: { net: 12.34 } })
    ).toEqual([{ from: "adam", to: "matt", amount: 12.34 }]);
  });

  it("should bring every balance to zero", () => {
    const settlement = {
      adam: { net: 40.1 },
      adela: { net: -70.55 },
      tia: { net: 60.2 },
      chris: { net: -29.75 },
    };
    const remainingCents = {};
    for (const personId of FOUR_PEOPLE) {
      remainingCents[personId] = Math.round(settlement[personId].net * 100);
    }
    const transfers = computeTransfers(settlement);
    for (const transfer of transfers) {
      expect(transfer.amount).toBeGreaterThan(0);
      remainingCents[transfer.from] += Math.round(transfer.amount * 100);
      remainingCents[transfer.to] -= Math.round(transfer.amount * 100);
    }
    expect(remainingCents).toEqual({ adam: 0, adela: 0, tia: 0, chris: 0 });
    expect(transfers.length).toBeLessThanOrEqual(3);
  });
});
