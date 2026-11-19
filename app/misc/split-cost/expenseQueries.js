// Server-only reads for the trip pages. Deliberately not a "use server" file:
// these functions do no access checks, so they must only be called from a
// page that has already decided the viewer may see the trip.

import { sql } from "@vercel/postgres";
import { ensureSchema } from "./actions";

/**
 * Lists a trip's expenses, newest first, with dates as YYYY-MM-DD strings.
 * @param {string} tripSlug - The trip slug.
 * @return {Promise<Array<Object>>} The expense rows.
 */
export async function listTripExpenses(tripSlug) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM expenses
    WHERE trip = ${tripSlug}
    ORDER BY expense_date DESC, id DESC
  `;
  return rows.map((row) => ({
    ...row,
    expense_date:
      row.expense_date instanceof Date
        ? row.expense_date.toISOString().slice(0, 10)
        : String(row.expense_date).slice(0, 10),
  }));
}
