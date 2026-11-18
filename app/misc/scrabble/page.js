import React from "react";
import Link from "next/link";
import styles from "./scrabble.module.css";
import Card from "../../components/ui/Card";
import NewGameForm from "./components/NewGameForm";
import { listGames } from "./actions";
import { playerTotals } from "./lib/scoring";
import { formatDate, gameDisplayName } from "./lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scrabble",
  description: "Scrabble scorekeeper.",
};

/**
 * Scrabble index — lists every game (most recently edited first) and offers a
 * form to start a new one.
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function ScrabbleIndexPage() {
  const games = await listGames();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/misc" className={styles.backLink}>
          ← Tools
        </Link>
        <h1 className={styles.title}>🔤 Scrabble</h1>
        <div className={styles.gameList}>
          {games.length === 0 && (
            <p className={styles.emptyText}>No games yet.</p>
          )}
          {games.map(({ id, game, updatedAt }) => {
            const totals = playerTotals(game);
            return (
              <Link
                key={id}
                href={`/misc/scrabble/${id}`}
                className={styles.gameLink}
              >
                <Card className={styles.gameCard}>
                  <div className={styles.gameCardHeader}>
                    <span className={styles.gameName}>
                      {gameDisplayName(game)}
                    </span>
                    <span className={styles.gameDate}>
                      {formatDate(updatedAt)}
                    </span>
                  </div>
                  <div className={styles.gameScores}>
                    {game.players.map((player, playerIndex) => (
                      <span key={playerIndex} className={styles.gameScore}>
                        {player} <strong>{totals[playerIndex]}</strong>
                      </span>
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        <NewGameForm />
      </div>
    </div>
  );
}
