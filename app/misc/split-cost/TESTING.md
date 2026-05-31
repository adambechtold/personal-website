# Split-Cost — Testing Charter

Split-cost (the "🇮🇪 Ireland Trip" tracker) handles **financial data**: it records who
paid for what, splits each expense between two people (Adam & Matt), converts
foreign-currency expenses to USD, and tells a human **who owes whom how much**.
Some of that must always be correct; some of it is cosmetic. This document is the
contract for what we test and why.

It is organized into three tiers. Each tier is a self-contained handoff. Work the
tiers in order of importance, not necessarily in order of writing.

## How to run tests

```bash
npm run test:unit     # vitest (pure functions, mocked actions, components)
```

The existing `npm test` (format + lint + build) is unchanged and still gates commits.

## The two prime invariants (everything in Tier 1 serves these)

1. **Per-expense conservation** — for any single expense,
   `adamPortion + mattPortion === amount` (in the expense's transaction currency).
   This holds whenever total shares > 0, which `validate()` now enforces at persist
   time. If it ever breaks, a row silently allocates money to nobody.

2. **Zero-sum settlement** — across all expenses, `adamNet + mattNet === 0`.
   One person's surplus is exactly the other's deficit. Money is never created or
   destroyed. This follows from invariant #1 holding for every row.

If you change anything in `calc.js` or `actions.js`, these two must still hold.

---

## Tier 1 — Mission-critical: money correctness

**Scope:** `app/misc/split-cost/calc.js` (pure functions: `computePortions`,
`computeSettlement`). No DB, no network, no React.
**Test file:** `app/misc/split-cost/calc.test.js` (a golden example already exists —
copy its style).

| #   | Invariant / condition                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `adamPortion + mattPortion === amount` for all valid inputs (uneven shares, large amounts, adjustments)                                 |
| 1.2 | `adamNet + mattNet === 0`, and `adamNet === -mattNet` even after independent `toFixed(2)` rounding                                      |
| 1.3 | Settlement direction: `adamNet > 0` ⇒ Matt owes Adam; `< 0` ⇒ Adam owes Matt; `\|adamNet\| < 0.01` ⇒ settled                            |
| 1.4 | USD conversion uses each expense's own `rate_to_base`; USD rows use rate 1                                                              |
| 1.5 | Re-running settlement on the same rows yields the same USD result (rates are frozen, not recomputed)                                    |
| 1.6 | Adjustments are carve-outs: conservation holds when `adj > amount`, when adjustments are negative, and when they sum to the full amount |
| 1.7 | Rounding policy: reconciling many odd splits (repeated `$0.01` 1:1, 1:2 splits) must not leak cents                                     |

## Tier 2 — Data integrity: bad data in ⇒ bad math later

**Scope:** `app/misc/split-cost/actions.js` (`validate`, `fetchRate`, `addExpense`,
`updateExpense`, `deleteExpense`, `ensureSchema`). Requires **mocking** `@vercel/postgres`
(`sql`) and global `fetch`; never hit a real DB or network.

| #   | Condition                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------- |
| 2.1 | A failed rate fetch (timeout, non-200, bad shape) **throws and aborts the insert** — nothing is persisted       |
| 2.2 | `validate` rejects: `paid_by ∉ {adam, matt}`, `amount ≤ 0`/NaN, missing date, negative shares                   |
| 2.3 | `validate` rejects total shares ≤ 0 (regression guard for the conservation fix)                                 |
| 2.4 | `addExpense`/`updateExpense` derive the stored rate from currency + date; USD ⇒ rate 1, non-USD ⇒ fetched rate  |
| 2.5 | Editing an expense never leaves a stale rate (changing currency/date re-derives the rate)                       |
| 2.6 | All DB writes stay parameterized (`sql\`\`` tagged templates) — no string-built SQL                             |
| 2.7 | `ensureSchema` is idempotent; the legacy backfill (USD / rate 1 / rate_date = expense_date) never corrupts rows |

## Tier 3 — Important, but degradation not money-loss

**Scope:** `TripTracker.js` rendering/behavior. Requires React Testing Library +
jsdom (set up inside this task).

| #   | Condition                                                                    |
| --- | ---------------------------------------------------------------------------- |
| 3.1 | Empty expense list ⇒ all zeros + "All settled up", no `NaN`                  |
| 3.2 | Filter-by-user changes only what's displayed, never the settlement totals    |
| 3.3 | The in-form "Cost" preview matches `computePortions` for the same inputs     |
| 3.4 | Settlement line text matches the sign of `adamNet` (uses the 1.3 thresholds) |

---

## Out of scope (fine to be wrong for now)

- `CostSplitter.js` — dead/placeholder, not wired into the route.
- Auth / per-user identity; `paid_by` is a hardcoded two-person enum on purpose.
- Visual/UX: styling, flags/emoji, date formatting, settlement wording, the
  `localStorage` "remember last payer" convenience.
- Concurrency / last-write-wins on simultaneous edits (low risk at two users).
- FX **source** accuracy: whatever frankfurter.dev returns is treated as truth. In
  scope is only that the rate is fetched-or-aborted and then frozen.

## Source fixes already applied (do not re-litigate; add regression tests instead)

- **Total shares > 0 is enforced** in `validate()` (`actions.js`). Previously 0/0
  shares broke conservation. → covered by 2.3.
- **`updateExpense` re-derives the rate** from currency + date instead of trusting the
  client-supplied value, so an edit can't leave a stale/mismatched rate. → covered by
  2.4 / 2.5.
