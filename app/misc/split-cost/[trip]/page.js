import React from "react";
import PropTypes from "prop-types";
import { notFound } from "next/navigation";
import { sql } from "@vercel/postgres";
import TripTracker from "../TripTracker";
import { ensureSchema } from "../actions";
import { findTrip } from "../trips";

export const dynamic = "force-dynamic";

/**
 * Builds the page metadata for a trip.
 * @param {{params: Promise<{trip: string}>}} props
 * @return {Promise<Object>} The metadata.
 */
export async function generateMetadata({ params }) {
  const { trip: tripSlug } = await params;
  const trip = findTrip(tripSlug);
  if (!trip) return { title: "Trip not found" };
  const names = trip.people.map((person) => person.name).join(", ");
  return {
    title: trip.name,
    description: `${trip.name} expense tracker for ${names}.`,
  };
}

/**
 * Trip tracker page — fetches the trip's expenses and renders the tracker.
 * @param {{params: Promise<{trip: string}>}} props
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function TripPage({ params }) {
  const { trip: tripSlug } = await params;
  const trip = findTrip(tripSlug);
  if (!trip) notFound();

  await ensureSchema();
  const { rows } = await sql`
    SELECT * FROM expenses
    WHERE trip = ${trip.slug}
    ORDER BY expense_date DESC, id DESC
  `;
  const expenses = rows.map((row) => ({
    ...row,
    expense_date:
      row.expense_date instanceof Date
        ? row.expense_date.toISOString().slice(0, 10)
        : String(row.expense_date).slice(0, 10),
  }));
  return <TripTracker trip={trip} initialExpenses={expenses} />;
}

TripPage.propTypes = {
  params: PropTypes.object.isRequired,
};
