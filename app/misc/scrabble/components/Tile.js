import React from "react";
import PropTypes from "prop-types";
import styles from "../scrabble.module.css";
import { BONUSES, tileValue } from "../lib/scoring";

export const BONUS_CLASS_NAMES = {
  none: "",
  "double-letter": styles.doubleLetter,
  "triple-letter": styles.tripleLetter,
  "double-word": styles.doubleWord,
  "triple-word": styles.tripleWord,
  blank: styles.blank,
};

export const BONUS_LABELS = {
  none: "No bonus",
  "double-letter": "Double letter",
  "triple-letter": "Triple letter",
  "double-word": "Double word",
  "triple-word": "Triple word",
  blank: "Blank tile",
};

/**
 * A wooden Scrabble tile showing its letter and point value, tinted by the
 * bonus square it was played on. Renders as a button when `onClick` is given.
 * @param {Object} props
 * @param {string} props.letter - The letter.
 * @param {string} props.bonus - One of BONUSES.
 * @param {Function} [props.onClick] - Makes the tile tappable.
 * @param {boolean} [props.small] - Renders the compact size.
 * @return {React.ReactElement}
 */
export default function Tile({ letter, bonus, onClick, small }) {
  const className = [
    styles.tile,
    BONUS_CLASS_NAMES[bonus] ?? "",
    small ? styles.tileSmall : "",
    onClick ? styles.tileButton : "",
  ]
    .filter(Boolean)
    .join(" ");
  const value = tileValue({ letter, bonus });
  const content = (
    <>
      <span className={styles.tileLetter}>{letter}</span>
      <sub className={styles.tileValue}>{value}</sub>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={`${letter}, ${BONUS_LABELS[bonus]}. Tap to change bonus.`}
      >
        {content}
      </button>
    );
  }
  return (
    <span className={className} title={BONUS_LABELS[bonus]}>
      {content}
    </span>
  );
}

Tile.propTypes = {
  letter: PropTypes.string.isRequired,
  bonus: PropTypes.oneOf(BONUSES).isRequired,
  onClick: PropTypes.func,
  small: PropTypes.bool,
};
