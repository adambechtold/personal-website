"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import styles from "./scrabble.module.css";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Scoreboard from "./components/Scoreboard";
import MoveHistory from "./components/MoveHistory";
import TurnEditor from "./components/TurnEditor";
import ShareLinkPanel from "../../components/ShareLinkPanel/ShareLinkPanel";
import { saveGame, loadGame, deleteGame } from "./actions";
import { currentPlayerIndex, playerTotals } from "./lib/scoring";
import { gameDisplayName } from "./lib/format";

const PASS_TURN = { words: [], bingo: false };

const SAVE_STATUS_TEXT = {
  saving: "Saving…",
  saved: "Saved",
};

/**
 * One game's scorekeeper: the scoreboard, the editable move history, and the
 * always-visible editor for the next turn. Every change saves the whole game,
 * one save at a time.
 *
 * Rendered for the signed-in owner (who also gets the share panel and can
 * delete the game) or for a guest arriving through a share link (who can only
 * play and edit this one game; every save carries their share key).
 * @param {Object} props
 * @param {number} props.gameId - The game id.
 * @param {Object} props.initialGame - The game as loaded.
 * @param {string} [props.guestShareKey] - Set when a guest is viewing.
 * @param {string|null} [props.ownerShareKey] - The game's current share key,
 *   for the owner's share panel.
 * @return {React.ReactElement}
 */
export default function ScrabbleGame({
  gameId,
  initialGame,
  guestShareKey,
  ownerShareKey,
}) {
  const isGuest = Boolean(guestShareKey);
  const [game, setGame] = useState(initialGame);
  const [editingTurnIndex, setEditingTurnIndex] = useState(null);
  const [nextTurnEditorKey, setNextTurnEditorKey] = useState(0);
  const [nextTurnDirty, setNextTurnDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [confirmingDeleteGame, setConfirmingDeleteGame] = useState(false);
  const [deletingGame, setDeletingGame] = useState(false);
  const [deleteGameFailed, setDeleteGameFailed] = useState(false);

  // The latest game, readable from async save and reload callbacks.
  const gameRef = useRef(initialGame);
  // Whether gameRef holds changes that haven't been sent yet.
  const unsavedRef = useRef(false);
  // Whether the save loop is running.
  const savingRef = useRef(false);
  // Mirrors of editing state for the visibility listener.
  const editingRef = useRef(false);
  editingRef.current = editingTurnIndex != null || nextTurnDirty;

  /**
   * Sends the latest game until nothing is left unsaved. Only one loop runs at
   * a time; edits made while a save is in flight are picked up by the next
   * pass, so saves never overlap or land out of order.
   */
  async function runSaves() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      while (unsavedRef.current) {
        unsavedRef.current = false;
        try {
          await saveGame(gameId, gameRef.current, guestShareKey);
        } catch {
          unsavedRef.current = true;
          setSaveStatus("error");
          return;
        }
      }
      setSaveStatus("saved");
    } finally {
      savingRef.current = false;
    }
  }

  /**
   * Applies a change to the game and queues a save of the whole game.
   * @param {Function} changeGame - Maps the current game to the new one.
   */
  function updateGame(changeGame) {
    const changedGame = changeGame(gameRef.current);
    gameRef.current = changedGame;
    setGame(changedGame);
    unsavedRef.current = true;
    runSaves();
  }

  /**
   * Reloads the game from the server, so turns entered on another phone show
   * up, unless something is being edited or saved here.
   */
  const reloadIfIdle = useCallback(async () => {
    const isBusy = () =>
      editingRef.current || savingRef.current || unsavedRef.current;
    if (isBusy()) return;
    try {
      const loadedGame = await loadGame(gameId, guestShareKey);
      if (!loadedGame || isBusy()) return;
      gameRef.current = loadedGame;
      setGame(loadedGame);
    } catch {
      // Offline or signed out: keep showing what we have.
    }
  }, [gameId, guestShareKey]);

  useEffect(() => {
    /** Reloads when the tab becomes visible again. */
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") reloadIfIdle();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [reloadIfIdle]);

  /**
   * Appends the next player's turn.
   * @param {{words: Array, bingo: boolean}} turn - The new turn.
   */
  function handleAddTurn(turn) {
    updateGame((current) => ({ ...current, turns: [...current.turns, turn] }));
    setNextTurnEditorKey((previous) => previous + 1);
    setNextTurnDirty(false);
  }

  /**
   * Replaces a past turn with its edited version.
   * @param {number} turnIndex - The turn's index.
   * @param {{words: Array, bingo: boolean}} turn - The edited turn.
   */
  function handleEditTurn(turnIndex, turn) {
    updateGame((current) => ({
      ...current,
      turns: current.turns.map((existingTurn, index) =>
        index === turnIndex ? turn : existingTurn
      ),
    }));
    setEditingTurnIndex(null);
  }

  /** Deletes the most recent turn (the only one that can be deleted). */
  function handleDeleteLastTurn() {
    updateGame((current) => ({
      ...current,
      turns: current.turns.slice(0, -1),
    }));
    setEditingTurnIndex(null);
  }

  /** Deletes the whole game; the server action redirects to the list. */
  async function handleDeleteGame() {
    setDeletingGame(true);
    setDeleteGameFailed(false);
    try {
      await deleteGame(gameId);
    } catch {
      setDeletingGame(false);
      setDeleteGameFailed(true);
    }
  }

  const totals = playerTotals(game);
  const nextPlayerIndex = currentPlayerIndex(game);
  const nextPlayer = game.players[nextPlayerIndex];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          {isGuest ? (
            <span />
          ) : (
            <Link href="/misc/scrabble" className={styles.backLink}>
              ← All games
            </Link>
          )}
          <span className={styles.saveStatus} aria-live="polite">
            {saveStatus === "error" ? (
              <button
                type="button"
                className={styles.retryButton}
                onClick={runSaves}
              >
                Save failed — retry
              </button>
            ) : (
              SAVE_STATUS_TEXT[saveStatus] ?? ""
            )}
          </span>
        </div>
        <h1 className={styles.gameTitle}>{gameDisplayName(game)}</h1>

        <Scoreboard
          players={game.players}
          totals={totals}
          currentPlayerIndex={nextPlayerIndex}
        />

        <MoveHistory
          game={game}
          editingTurnIndex={editingTurnIndex}
          onStartEditing={setEditingTurnIndex}
          onCancelEditing={() => setEditingTurnIndex(null)}
          onSaveTurn={handleEditTurn}
          onDeleteLastTurn={handleDeleteLastTurn}
        />

        <Card accent className={styles.nextTurnCard}>
          <TurnEditor
            key={`${nextTurnEditorKey}-${nextPlayerIndex}`}
            initialTurn={PASS_TURN}
            title={`${nextPlayer}'s turn`}
            submitLabel="Submit"
            onSubmit={handleAddTurn}
            onPass={() => handleAddTurn(PASS_TURN)}
            onDirtyChange={setNextTurnDirty}
          />
        </Card>

        {!isGuest && (
          <ShareLinkPanel
            kind="scrabble"
            target={gameId}
            initialShareKey={ownerShareKey ?? null}
          />
        )}

        {!isGuest && (
          <div className={styles.deleteGameRow}>
            {confirmingDeleteGame ? (
              <>
                <span className={styles.mutedText}>
                  {deleteGameFailed
                    ? "Couldn't delete — try again?"
                    : "Delete this game for good?"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  className={styles.dangerButton}
                  onClick={handleDeleteGame}
                  disabled={deletingGame}
                >
                  {deletingGame ? "Deleting…" : "Delete"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmingDeleteGame(false)}
                  disabled={deletingGame}
                >
                  Keep
                </Button>
              </>
            ) : (
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => setConfirmingDeleteGame(true)}
              >
                Delete game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

ScrabbleGame.propTypes = {
  gameId: PropTypes.number.isRequired,
  initialGame: PropTypes.shape({
    name: PropTypes.string.isRequired,
    players: PropTypes.arrayOf(PropTypes.string).isRequired,
    turns: PropTypes.array.isRequired,
  }).isRequired,
  guestShareKey: PropTypes.string,
  ownerShareKey: PropTypes.string,
};
