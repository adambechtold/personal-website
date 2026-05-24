import React from "react";
import { sql } from "@vercel/postgres";
import TripTracker from "./TripTracker";
import { ensureSchema } from "./actions";

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
  return <TripTracker initialExpenses={expenses} />;
}
