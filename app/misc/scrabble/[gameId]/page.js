import React from "react";
import PropTypes from "prop-types";
import { notFound } from "next/navigation";
import ScrabbleGame from "../ScrabbleGame";
import { loadGame } from "../actions";
import { gameDisplayName } from "../lib/format";

export const dynamic = "force-dynamic";

/**
 * Builds the page metadata for a game.
 * @param {{params: Promise<{gameId: string}>}} props
 * @return {Promise<Object>} The metadata.
 */
export async function generateMetadata({ params }) {
  const { gameId } = await params;
  const game = await loadGame(gameId);
  if (!game) return { title: "Game not found" };
  return {
    title: `${gameDisplayName(game)} · Scrabble`,
    description: `Scrabble scorekeeper for ${game.players.join(", ")}.`,
  };
}

/**
 * Game page — loads one game and renders its scorekeeper.
 * @param {{params: Promise<{gameId: string}>}} props
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function ScrabbleGamePage({ params }) {
  const { gameId } = await params;
  const game = await loadGame(gameId);
  if (!game) notFound();
  return <ScrabbleGame gameId={Number(gameId)} initialGame={game} />;
}

ScrabbleGamePage.propTypes = {
  params: PropTypes.object.isRequired,
};
