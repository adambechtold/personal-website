"use client";

import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "../scrabble.module.css";
import Button from "../../../components/ui/Button";
import Tile, { BONUS_CLASS_NAMES, BONUS_LABELS } from "./Tile";
import {
  BINGO_POINTS,
  nextBonus,
  tilesFromText,
  turnScore,
  wordScore,
  wordText,
} from "../lib/scoring";

const LEGEND_BONUSES = [
  "double-letter",
  "triple-letter",
  "double-word",
  "triple-word",
  "blank",
];

/**
 * Builds the editable draft for a turn. Every draft word gets a stable key so
 * removing a word doesn't shuffle the inputs; a turn with no words (a pass or
 * a brand-new turn) starts with one empty word to type into.
 * @param {{words: Array, bingo: boolean}} turn - The turn to edit.
 * @param {Function} nextKey - Returns a fresh key.
 * @return {{words: Array<{key: number, tiles: Array}>, bingo: boolean}}
 */
function draftFromTurn(turn, nextKey) {
  const words = turn.words.map((word) => ({
    key: nextKey(),
    tiles: word.tiles.map((tile) => ({ ...tile })),
  }));
  if (words.length === 0) words.push({ key: nextKey(), tiles: [] });
  return { words, bingo: turn.bingo };
}

/**
 * Converts a draft back into a turn, dropping words with no letters.
 * @param {{words: Array, bingo: boolean}} draft - The draft.
 * @return {{words: Array, bingo: boolean}} The turn.
 */
function turnFromDraft(draft) {
  const words = draft.words
    .filter((word) => word.tiles.length > 0)
    .map((word) => ({ tiles: word.tiles }));
  return { words, bingo: words.length > 0 && draft.bingo };
}

/**
 * Edits one turn: a text input per word, tappable tiles that cycle their
 * bonus, a bingo checkbox, a legend, and live word and turn totals.
 * @param {Object} props
 * @param {{words: Array, bingo: boolean}} props.initialTurn - Starting turn.
 * @param {string} props.title - Heading, e.g. "adela's turn".
 * @param {string} props.submitLabel - Label of the submit button.
 * @param {boolean} [props.allowEmptySubmit] - Lets a turn with no words be
 *   submitted (it becomes a pass).
 * @param {Function} props.onSubmit - Called with the edited turn.
 * @param {Function} [props.onPass] - Shows a Pass button.
 * @param {Function} [props.onCancel] - Shows a Cancel button.
 * @param {Function} [props.onDelete] - Shows a Delete turn button.
 * @param {Function} [props.onDirtyChange] - Told whether anything is typed.
 * @param {boolean} [props.autoFocus] - Focuses the first word on mount.
 * @return {React.ReactElement}
 */
export default function TurnEditor({
  initialTurn,
  title,
  submitLabel,
  allowEmptySubmit,
  onSubmit,
  onPass,
  onCancel,
  onDelete,
  onDirtyChange,
  autoFocus,
}) {
  const keyCounter = useRef(0);
  /**
   * @return {number} A key no other draft word in this editor has used.
   */
  function nextKey() {
    keyCounter.current += 1;
    return keyCounter.current;
  }

  const [draft, setDraft] = useState(() => draftFromTurn(initialTurn, nextKey));
  const [focusWordKey, setFocusWordKey] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inputRefs = useRef({});

  const editedTurn = turnFromDraft(draft);
  const isDirty = editedTurn.words.length > 0 || draft.bingo;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (autoFocus) setFocusWordKey(draft.words[0].key);
    // Only on mount: later focus moves are driven by "+ Word".
  }, []);

  useEffect(() => {
    if (focusWordKey == null) return;
    inputRefs.current[focusWordKey]?.focus();
    setFocusWordKey(null);
  }, [focusWordKey]);

  /**
   * Replaces a word's tiles from what was typed, keeping each position's bonus.
   * @param {number} wordKey - The draft word's key.
   * @param {string} text - The input's new text.
   */
  function handleWordTextChange(wordKey, text) {
    setDraft((previous) => ({
      ...previous,
      words: previous.words.map((word) =>
        word.key === wordKey
          ? { ...word, tiles: tilesFromText(text, word.tiles) }
          : word
      ),
    }));
  }

  /**
   * Cycles one tile's bonus to the next one.
   * @param {number} wordKey - The draft word's key.
   * @param {number} tileIndex - The tile's position in the word.
   */
  function handleTileTap(wordKey, tileIndex) {
    setDraft((previous) => ({
      ...previous,
      words: previous.words.map((word) =>
        word.key === wordKey
          ? {
              ...word,
              tiles: word.tiles.map((tile, index) =>
                index === tileIndex
                  ? { ...tile, bonus: nextBonus(tile.bonus) }
                  : tile
              ),
            }
          : word
      ),
    }));
  }

  /** Adds an empty word and focuses it. */
  function handleAddWord() {
    const key = nextKey();
    setDraft((previous) => ({
      ...previous,
      words: [...previous.words, { key, tiles: [] }],
    }));
    setFocusWordKey(key);
  }

  /**
   * Removes a word. The last remaining word is cleared instead, so there is
   * always an input to type into.
   * @param {number} wordKey - The draft word's key.
   */
  function handleRemoveWord(wordKey) {
    setDraft((previous) => {
      const words = previous.words.filter((word) => word.key !== wordKey);
      if (words.length === 0) words.push({ key: nextKey(), tiles: [] });
      return { ...previous, words };
    });
  }

  /**
   * Submits the edited turn.
   * @param {React.FormEvent} event - The submit event.
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (editedTurn.words.length === 0 && !allowEmptySubmit) return;
    onSubmit(editedTurn);
  }

  const canSubmit = allowEmptySubmit || editedTurn.words.length > 0;

  return (
    <form className={styles.turnEditor} onSubmit={handleSubmit}>
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>{title}</span>
        <span className={styles.editorTotal}>{turnScore(editedTurn)}</span>
      </div>

      {draft.words.map((word, wordIndex) => (
        <div key={word.key} className={styles.wordEditor}>
          <div className={styles.wordInputRow}>
            <input
              ref={(element) => {
                inputRefs.current[word.key] = element;
              }}
              className={`${styles.input} ${styles.wordInput}`}
              value={wordText(word)}
              onChange={(event) =>
                handleWordTextChange(word.key, event.target.value)
              }
              placeholder={wordIndex === 0 ? "Word" : "Another word"}
              aria-label={`Word ${wordIndex + 1}`}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
            />
            <span className={styles.wordScore}>{wordScore(word)}</span>
            <button
              type="button"
              className={styles.removeWordButton}
              onClick={() => handleRemoveWord(word.key)}
              aria-label={`Remove word ${wordIndex + 1}`}
            >
              ✕
            </button>
          </div>
          {word.tiles.length > 0 && (
            <div className={styles.tileRow}>
              {word.tiles.map((tile, tileIndex) => (
                <Tile
                  key={tileIndex}
                  letter={tile.letter}
                  bonus={tile.bonus}
                  onClick={() => handleTileTap(word.key, tileIndex)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <div className={styles.editorOptions}>
        <Button type="button" size="sm" onClick={handleAddWord}>
          + Word
        </Button>
        <label className={styles.bingoLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={draft.bingo}
            onChange={(event) => {
              const checked = event.target.checked;
              setDraft((previous) => ({ ...previous, bingo: checked }));
            }}
          />
          Bingo (+{BINGO_POINTS})
        </label>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendHint}>Tap a tile to set its bonus:</span>
        {LEGEND_BONUSES.map((bonus) => (
          <span key={bonus} className={styles.legendItem}>
            <span
              className={`${styles.legendSwatch} ${BONUS_CLASS_NAMES[bonus]}`}
            />
            {BONUS_LABELS[bonus]}
          </span>
        ))}
      </div>

      <div className={styles.editorActions}>
        <Button
          type="submit"
          variant="primary"
          className={styles.growButton}
          disabled={!canSubmit}
        >
          {submitLabel}
        </Button>
        {onPass && (
          <Button type="button" variant="outlined" onClick={onPass}>
            Pass
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {onDelete && (
        <div className={styles.deleteTurnRow}>
          {confirmingDelete ? (
            <>
              <span className={styles.mutedText}>Delete this turn?</span>
              <Button
                type="button"
                size="sm"
                className={styles.dangerButton}
                onClick={onDelete}
              >
                Delete
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Keep
              </Button>
            </>
          ) : (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete turn
            </button>
          )}
        </div>
      )}
    </form>
  );
}

TurnEditor.propTypes = {
  initialTurn: PropTypes.shape({
    words: PropTypes.array.isRequired,
    bingo: PropTypes.bool.isRequired,
  }).isRequired,
  title: PropTypes.string.isRequired,
  submitLabel: PropTypes.string.isRequired,
  allowEmptySubmit: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onPass: PropTypes.func,
  onCancel: PropTypes.func,
  onDelete: PropTypes.func,
  onDirtyChange: PropTypes.func,
  autoFocus: PropTypes.bool,
};
