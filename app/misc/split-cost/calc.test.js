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
  it("should split evenly with equal shares and no adjustments", () => {
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

  it("should split by uneven shares", () => {
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

  it("should carve out an adjustment and split the remainder", () => {
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

  it("should conserve the full amount across thousands of random valid expenses", () => {
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

  // adjustment edge cases
  it("should conserve the full amount when an adjustment exceeds the total", () => {
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

  it("should conserve the full amount with a negative adjustment", () => {
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

  it("should conserve the full amount when adjustments consume the entire expense", () => {
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

  it("should conserve the full amount when both adjustments are negative", () => {
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

  // When paid_by is absent (e.g. in-form cost preview), no rounding is applied
  // and raw floats are returned. Conservation still holds at float precision.
  it("should return raw portions that sum to the full amount for a sub-cent 1:1 split", () => {
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

  it("should return raw portions that sum to the full amount for a sub-cent 1:2 split", () => {
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

  // Payer-gets-the-extra-cent rounding policy (authorized by Adam Bechtold).
  // When paid_by is set, the non-payer's portion is rounded to the nearest cent
  // and the payer's portion is the exact remainder, so the payer recoups any
  // sub-cent fraction in settlement rather than absorbing it.
  it("should give the payer the sub-cent remainder when adam paid", () => {
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

  it("should give the payer the sub-cent remainder when matt paid", () => {
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

  it("should not alter portions that divide evenly to the cent", () => {
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

  it("should conserve the full amount across hundreds of random cent inputs when paid_by is set", () => {
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
  it("should return all zeros for an empty expense list", () => {
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const s = computeSettlement(expenses);
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
    const first = computeSettlement(expenses);
    const second = computeSettlement(expenses);
    expect(second.adamNet).toBe(first.adamNet);
    expect(second.mattNet).toBe(first.mattNet);
    expect(second.adamPaid).toBe(first.adamPaid);
    expect(second.mattPaid).toBe(first.mattPaid);
    expect(second.adamOwed).toBe(first.adamOwed);
    expect(second.mattOwed).toBe(first.mattOwed);
  });

  it("should not leak cents across many accumulated sub-cent expenses", () => {
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
