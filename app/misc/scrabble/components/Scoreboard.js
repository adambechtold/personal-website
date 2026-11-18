import React from "react";
import PropTypes from "prop-types";
import styles from "../scrabble.module.css";
import { leaderIndexes } from "../lib/scoring";

/**
 * Each player's total, with the player whose turn it is highlighted and a
 * crown on the leader(s).
 * @param {Object} props
 * @param {Array<string>} props.players - Players in turn order.
 * @param {Array<number>} props.totals - Totals in the same order.
 * @param {number} props.currentPlayerIndex - Whose turn it is.
 * @return {React.ReactElement}
 */
export default function Scoreboard({ players, totals, currentPlayerIndex }) {
  const leaders = new Set(leaderIndexes(totals));
  return (
    <div
      className={styles.scoreboard}
      style={{ "--player-count": Math.min(players.length, 4) }}
    >
      {players.map((player, playerIndex) => {
        const isCurrent = playerIndex === currentPlayerIndex;
        return (
          <div
            key={playerIndex}
            className={`${styles.scoreCell} ${
              isCurrent ? styles.scoreCellCurrent : ""
            }`}
            aria-current={isCurrent ? "true" : undefined}
          >
            <div className={styles.scorePlayer}>
              {leaders.has(playerIndex) && (
                <span className={styles.crown} aria-label="Leader">
                  👑{" "}
                </span>
              )}
              {player}
            </div>
            <div className={styles.scoreTotal}>{totals[playerIndex]}</div>
            {isCurrent && <div className={styles.scoreUpNext}>up next</div>}
          </div>
        );
      })}
    </div>
  );
}

Scoreboard.propTypes = {
  players: PropTypes.arrayOf(PropTypes.string).isRequired,
  totals: PropTypes.arrayOf(PropTypes.number).isRequired,
  currentPlayerIndex: PropTypes.number.isRequired,
};
