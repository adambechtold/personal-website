import React from "react";
import PropTypes from "prop-types";
import { notFound } from "next/navigation";
import TripTracker from "../TripTracker";
import { listTripExpenses } from "../expenseQueries";
import { findShareKeyFor } from "../../../lib/shareLinks";
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

  const [expenses, shareKey] = await Promise.all([
    listTripExpenses(trip.slug),
    findShareKeyFor("trip", trip.slug),
  ]);
  return (
    <TripTracker
      trip={trip}
      initialExpenses={expenses}
      ownerShareKey={shareKey}
    />
  );
}

TripPage.propTypes = {
  params: PropTypes.object.isRequired,
};
