import React from "react";
import PropTypes from "prop-types";
import { notFound } from "next/navigation";
import ScrabbleGame from "../../misc/scrabble/ScrabbleGame";
import TripTracker from "../../misc/split-cost/TripTracker";
import { loadGame } from "../../misc/scrabble/actions";
import { listTripExpenses } from "../../misc/split-cost/expenseQueries";
import { findTrip } from "../../misc/split-cost/trips";
import { findShareLink } from "../../lib/shareLinks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shared",
  robots: { index: false, follow: false },
  // The share key is in the URL; don't hand it to other sites.
  referrer: "no-referrer",
};

/**
 * Guest page for a share link: no sign-in, access to exactly the one game or
 * trip the key was issued for. Not covered by the middleware on purpose —
 * every read and write here is checked against the key instead.
 * @param {{params: Promise<{shareKey: string}>}} props
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function SharedPage({ params }) {
  const { shareKey } = await params;
  const shareLink = await findShareLink(shareKey);
  if (!shareLink) notFound();

  if (shareLink.kind === "scrabble") {
    const gameId = Number(shareLink.target);
    const game = await loadGame(gameId, shareKey);
    if (!game) notFound();
    return (
      <ScrabbleGame
        gameId={gameId}
        initialGame={game}
        guestShareKey={shareKey}
      />
    );
  }

  if (shareLink.kind === "trip") {
    const trip = findTrip(shareLink.target);
    if (!trip) notFound();
    const expenses = await listTripExpenses(trip.slug);
    return (
      <TripTracker
        trip={trip}
        initialExpenses={expenses}
        guestShareKey={shareKey}
      />
    );
  }

  notFound();
}

SharedPage.propTypes = {
  params: PropTypes.object.isRequired,
};
