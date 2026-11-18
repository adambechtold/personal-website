"use client";

import React, { useState } from "react";
import styles from "../scrabble.module.css";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { createGame } from "../actions";

/**
 * "New game" form: an optional name plus a comma-separated list of players in
 * turn order. On success the server action redirects to the new game.
 * @return {React.ReactElement}
 */
export default function NewGameForm() {
  const [name, setName] = useState("");
  const [playersText, setPlayersText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  /**
   * Creates the game. A successful call redirects, so it only returns on a
   * validation error.
   * @param {React.FormEvent} event - The submit event.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await createGame(name, playersText);
      if (result?.error) setError(result.error);
    } catch {
      setError("Couldn't create the game — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className={styles.newGameCard}>
      <h2 className={styles.sectionTitle}>New game</h2>
      <form onSubmit={handleSubmit} className={styles.newGameForm}>
        <label className={styles.label} htmlFor="new-game-name">
          Name (optional)
        </label>
        <input
          id="new-game-name"
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Friday night"
          autoComplete="off"
        />
        <label className={styles.label} htmlFor="new-game-players">
          Players, in turn order
        </label>
        <input
          id="new-game-players"
          className={styles.input}
          value={playersText}
          onChange={(event) => setPlayersText(event.target.value)}
          placeholder="adam, adela, luis"
          autoComplete="off"
          autoCapitalize="none"
          required
        />
        {error && <p className={styles.errorText}>{error}</p>}
        <Button
          type="submit"
          variant="primary"
          className={styles.fullWidthButton}
          disabled={pending}
        >
          {pending ? "Creating…" : "Start game"}
        </Button>
      </form>
    </Card>
  );
}
