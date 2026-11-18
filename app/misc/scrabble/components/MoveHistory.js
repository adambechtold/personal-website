"use client";

import React from "react";
import PropTypes from "prop-types";
import styles from "../scrabble.module.css";
import Tile from "./Tile";
import TurnEditor from "./TurnEditor";
import { buildRounds } from "../lib/scoring";

/**
 * The move history, grouped by round. Tapping a row opens an inline editor
 * for that turn; only the most recent turn can be deleted, so turn order (and
 * so who played each turn) never shifts.
 * @param {Object} props
 * @param {Object} props.game - The game.
 * @param {number|null} props.editingTurnIndex - The turn being edited.
 * @param {Function} props.onStartEditing - Called with a turn index.
 * @param {Function} props.onCancelEditing - Closes the editor.
 * @param {Function} props.onSaveTurn - Called with (turnIndex, turn).
 * @param {Function} props.onDeleteLastTurn - Deletes the most recent turn.
 * @return {React.ReactElement|null}
 */
export default function MoveHistory({
  game,
  editingTurnIndex,
  onStartEditing,
  onCancelEditing,
  onSaveTurn,
  onDeleteLastTurn,
}) {
  const rounds = buildRounds(game);
  if (rounds.length === 0) {
    return <p className={styles.emptyText}>No moves yet.</p>;
  }
  const lastTurnIndex = game.turns.length - 1;

  return (
    <div className={styles.history}>
      {rounds.map((round) => (
        <section key={round.number} className={styles.round}>
          <h2 className={styles.roundTitle}>Move {round.number}</h2>
          {round.entries.map((entry) => {
            const player = game.players[entry.playerIndex];
            if (entry.turnIndex === editingTurnIndex) {
              return (
                <div key={entry.turnIndex} className={styles.turnRowEditing}>
                  <TurnEditor
                    initialTurn={entry.turn}
                    title={`Edit ${player}'s turn`}
                    submitLabel="Save"
                    allowEmptySubmit
                    autoFocus
                    onSubmit={(turn) => onSaveTurn(entry.turnIndex, turn)}
                    onCancel={onCancelEditing}
                    onDelete={
                      entry.turnIndex === lastTurnIndex
                        ? onDeleteLastTurn
                        : undefined
                    }
                  />
                </div>
              );
            }
            return (
              <button
                key={entry.turnIndex}
                type="button"
                className={styles.turnRow}
                onClick={() => onStartEditing(entry.turnIndex)}
                aria-label={`${player}'s turn, ${entry.score} points. Tap to edit.`}
              >
                <span className={styles.turnPlayer}>
                  <span className={styles.turnPlayerName}>{player}</span>
                  <span className={styles.turnRunningTotal}>
                    {entry.runningTotal}
                  </span>
                </span>
                <span className={styles.turnWords}>
                  {entry.turn.words.length === 0 ? (
                    <span className={styles.passText}>Pass</span>
                  ) : (
                    entry.turn.words.map((word, wordIndex) => (
                      <span key={wordIndex} className={styles.turnWord}>
                        {word.tiles.map((tile, tileIndex) => (
                          <Tile
                            key={tileIndex}
                            letter={tile.letter}
                            bonus={tile.bonus}
                            small
                          />
                        ))}
                      </span>
                    ))
                  )}
                  {entry.turn.bingo && (
                    <span className={styles.bingoBadge}>Bingo</span>
                  )}
                </span>
                <span className={styles.turnScore}>{entry.score}</span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

MoveHistory.propTypes = {
  game: PropTypes.shape({
    players: PropTypes.arrayOf(PropTypes.string).isRequired,
    turns: PropTypes.array.isRequired,
  }).isRequired,
  editingTurnIndex: PropTypes.number,
  onStartEditing: PropTypes.func.isRequired,
  onCancelEditing: PropTypes.func.isRequired,
  onSaveTurn: PropTypes.func.isRequired,
  onDeleteLastTurn: PropTypes.func.isRequired,
};
