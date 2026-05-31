import { describe, it, expect } from "vitest";
import { computePortions, computeSettlement } from "./calc";

/**
 * GOLDEN PATTERN — Tier 1 (pure money-math).
 *
 * Copy the style of these tests. They assert the two prime invariants from
 * TESTING.md plus a couple of concrete cases. No DB, no network, no React.
 * Run with:  npm run test:unit
 */

describe("computePortions", () => {
  it("splits evenly with equal shares and no adjustments (1.1 conservation)", () => {
    const { adamPortion, mattPortion } = computePortions({
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

  it("splits by uneven shares", () => {
    const { adamPortion, mattPortion } = computePortions({
      amount: "90",
      adam_shares: "2",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(60, 10);
    expect(mattPortion).toBeCloseTo(30, 10);
  });

  it("carves out an adjustment, then splits the remainder", () => {
    // Adam had a $20 personal item; the remaining $80 splits 1:1.
    const { adamPortion, mattPortion } = computePortions({
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

  it("conserves the amount for thousands of random valid expenses (1.1)", () => {
    for (let i = 0; i < 2000; i++) {
      const amount = Math.round(Math.random() * 1_000_000) / 100; // up to $10k, 2dp
      const adamShares = Math.floor(Math.random() * 10);
      // ensure total shares > 0, which validate() enforces at persist time
      const mattShares =
        Math.floor(Math.random() * 10) + (adamShares === 0 ? 1 : 0);
      const adamAdj = Math.round((Math.random() - 0.5) * 4000) / 100;
      const mattAdj = Math.round((Math.random() - 0.5) * 4000) / 100;
      const { adamPortion, mattPortion } = computePortions({
        amount,
        adam_shares: adamShares,
        matt_shares: mattShares,
        adam_adjustment: adamAdj,
        matt_adjustment: mattAdj,
      });
      expect(adamPortion + mattPortion).toBeCloseTo(amount, 6);
    }
  });

  // 1.6 — adjustment edge cases
  it("1.6 conservation holds when adam_adjustment exceeds the amount", () => {
    // amount=10, adamAdj=15 → remaining=-5; adam=-2.5+15=12.5, matt=-2.5; sum=10
    const { adamPortion, mattPortion } = computePortions({
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

  it("1.6 conservation holds with a negative adjustment", () => {
    // adamAdj=-10 → remaining=110; adam=55-10=45, matt=55; sum=100
    const { adamPortion, mattPortion } = computePortions({
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

  it("1.6 conservation holds when adjustments sum to the full amount", () => {
    // all money is pre-carved; remaining=0 so shares add nothing
    const { adamPortion, mattPortion } = computePortions({
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

  it("1.6 conservation holds when both adjustments are negative", () => {
    // both negative → remaining > amount; sum must still equal amount
    const { adamPortion, mattPortion } = computePortions({
      amount: "100",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "-20",
      matt_adjustment: "-10",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(100, 10);
  });

  // 1.7 — sub-cent conservation without paid_by: no rounding is applied when
  // paid_by is absent (e.g. in-form cost preview), so raw floats are returned.
  it("1.7 sub-cent conservation (no paid_by): $0.01 split 1:1 sums to the full amount", () => {
    // each person gets 0.005 as a raw float; no payer rounding applied
    const { adamPortion, mattPortion } = computePortions({
      amount: "0.01",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("1.7 sub-cent conservation (no paid_by): $0.01 split 1:2 sums to the full amount", () => {
    // adam gets 0.00333…, matt gets 0.00666…; sum = 0.01
    const { adamPortion, mattPortion } = computePortions({
      amount: "0.01",
      adam_shares: "1",
      matt_shares: "2",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  // 1.7 — payer-gets-the-extra-cent rounding policy (authorized by Adam Bechtold).
  // When paid_by is set, the non-payer's portion is rounded to the nearest cent and
  // the payer's portion is the exact remainder, so the payer recoups any sub-cent
  // fraction in the settlement rather than absorbing it.
  it("1.7 rounding: adam paid — matt owes the full cent on a $0.01 1:1 split", () => {
    // raw portions are $0.005 each; Matt (non-payer) rounds up to $0.01; Adam gets $0.00
    // In settlement Adam paid $0.01, owes $0.00 → Adam receives the full cent back
    const { adamPortion, mattPortion } = computePortions({
      amount: "0.01",
      paid_by: "adam",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(mattPortion).toBeCloseTo(0.01, 10);
    expect(adamPortion).toBeCloseTo(0.0, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("1.7 rounding: matt paid — adam owes the full cent on a $0.01 1:1 split", () => {
    // Adam (non-payer) rounds up to $0.01; Matt gets $0.00
    const { adamPortion, mattPortion } = computePortions({
      amount: "0.01",
      paid_by: "matt",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    });
    expect(adamPortion).toBeCloseTo(0.01, 10);
    expect(mattPortion).toBeCloseTo(0.0, 10);
    expect(adamPortion + mattPortion).toBeCloseTo(0.01, 10);
  });

  it("1.7 rounding: even-cent splits are unaffected by the payer rule", () => {
    // $100 split 1:1 divides exactly; no rounding needed regardless of payer
    const { adamPortion, mattPortion } = computePortions({
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

  it("1.7 rounding: conservation holds with paid_by set for hundreds of random cent amounts", () => {
    for (let i = 0; i < 500; i++) {
      // Use whole-cent amounts (input data is always in cents per validate())
      const cents = Math.floor(Math.random() * 100000);
      const amount = cents / 100;
      const payer = Math.random() < 0.5 ? "adam" : "matt";
      const adamShares = Math.floor(Math.random() * 5) + 1;
      const mattShares = Math.floor(Math.random() * 5) + 1;
      const { adamPortion, mattPortion } = computePortions({
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
  it("returns all zeros for an empty list", () => {
    const s = computeSettlement([]);
    expect(s).toEqual({
      adamPaid: 0,
      mattPaid: 0,
      adamOwed: 0,
      mattOwed: 0,
      adamNet: 0,
      mattNet: 0,
    });
  });

  it("is zero-sum: adamNet === -mattNet (1.2)", () => {
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
    const s = computeSettlement(expenses);
    // Adam paid 100, owes 70; Matt paid 40, owes 70. Matt owes Adam 30.
    expect(s.adamNet).toBeCloseTo(30, 10);
    expect(s.mattNet).toBeCloseTo(-30, 10);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
  });

  it("converts to USD via each expense's frozen rate_to_base (1.4)", () => {
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
    const s = computeSettlement(expenses);
    expect(s.mattPaid).toBeCloseTo(55, 10); // 50 * 1.1
    expect(s.adamOwed).toBeCloseTo(27.5, 10);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
  });

  it("1.2 zero-sum holds across a mixed-currency expense list", () => {
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
    const s = computeSettlement(expenses);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
    expect(s.adamNet).toBeCloseTo(-s.mattNet, 10);
  });

  it("1.3 settlement direction: adamNet > 0 when Adam overpaid (Matt owes Adam)", () => {
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
    const s = computeSettlement(expenses);
    expect(s.adamNet).toBeGreaterThan(0);
    expect(s.adamNet).toBeCloseTo(50, 10);
  });

  it("1.3 settlement direction: adamNet < 0 when Matt overpaid (Adam owes Matt)", () => {
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
    const s = computeSettlement(expenses);
    expect(s.adamNet).toBeLessThan(0);
    expect(s.adamNet).toBeCloseTo(-50, 10);
  });

  it("1.3 settlement direction: |adamNet| < 0.01 when expenses exactly balance (settled)", () => {
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
    const s = computeSettlement(expenses);
    expect(Math.abs(s.adamNet)).toBeLessThan(0.01);
  });

  it("1.4 each expense uses its own rate_to_base, not a shared rate", () => {
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
    const s = computeSettlement(expenses);
    expect(s.adamPaid).toBeCloseTo(200, 10);
    expect(s.mattPaid).toBeCloseTo(50, 10);
  });

  it("1.4 USD row applies rate 1 and amount passes through unchanged", () => {
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
    const s = computeSettlement(expenses);
    expect(s.adamPaid).toBeCloseTo(75, 10); // 75 * 1 = 75, unchanged
    expect(s.adamOwed).toBeCloseTo(37.5, 10);
    expect(s.mattOwed).toBeCloseTo(37.5, 10);
  });

  it("1.5 re-running settlement on the same rows yields identical results", () => {
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
    const first = computeSettlement(expenses);
    const second = computeSettlement(expenses);
    expect(second.adamNet).toBe(first.adamNet);
    expect(second.mattNet).toBe(first.mattNet);
    expect(second.adamPaid).toBe(first.adamPaid);
    expect(second.mattPaid).toBe(first.mattPaid);
    expect(second.adamOwed).toBe(first.adamOwed);
    expect(second.mattOwed).toBe(first.mattOwed);
  });

  it("1.7 repeated $0.01 expenses do not leak cents in settlement totals", () => {
    // 100 × $0.01 paid by adam, split 1:1
    // Payer rounding: each expense → adam portion $0.00, matt portion $0.01
    // adamPaid=1.00, adamOwed=0.00, mattOwed=1.00 → adamNet=1.00 (Matt owes Adam $1)
    const expenses = Array.from({ length: 100 }, () => ({
      paid_by: "adam",
      amount: "0.01",
      rate_to_base: "1",
      adam_shares: "1",
      matt_shares: "1",
      adam_adjustment: "0",
      matt_adjustment: "0",
    }));
    const s = computeSettlement(expenses);
    expect(s.adamNet + s.mattNet).toBeCloseTo(0, 10);
    expect(s.adamNet).toBeCloseTo(1.0, 10);
  });
});
