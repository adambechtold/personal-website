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
});
