import React from "react";
import { sql } from "@vercel/postgres";
import TripTracker from "./TripTracker";
import { ensureSchema } from "./actions";
import { checkInvariants } from "./calc";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ireland Trip",
  description: "Ireland trip expense tracker for Adam and Matt.",
};

/**
 * Ireland trip tracker page — fetches all expenses and renders the tracker.
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function SplitCostPage() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM expenses ORDER BY expense_date DESC, id DESC
  `;
  const expenses = rows.map((row) => ({
    ...row,
    expense_date:
      row.expense_date instanceof Date
        ? row.expense_date.toISOString().slice(0, 10)
        : String(row.expense_date).slice(0, 10),
  }));
  // Server-side half of the runtime guardrail: log invariant violations to
  // the server logs (e.g. Vercel) so a corrupt settlement is recorded even if
  // no one happens to be watching the browser console. The client renders the
  // visible banner; this is the durable paper trail.
  const integrity = checkInvariants(expenses);
  if (!integrity.ok) {
    console.error(
      "[split-cost] Money invariant violation:\n" +
        integrity.violations.join("\n")
    );
  }

  return <TripTracker initialExpenses={expenses} />;
}
