"use client";

import PropTypes from "prop-types";
import styles from "./comments.module.css";

/**
 * The affordance that summons a thread: a 💬 chip with the comment count, plus
 * an optional one-line teaser of the latest comment. Shared by both shells.
 * @param {Object} props
 * @param {number} props.count
 * @param {Object} [props.latest] - Most recent comment, for the teaser.
 * @param {boolean} [props.active] - Whether the thread is currently open.
 * @param {boolean} [props.showTeaser] - Whether to render the latest-comment teaser.
 * @param {boolean} [props.caret] - Whether to show an expand/collapse caret (accordion only).
 * @param {function} props.onClick
 * @return {React.ReactElement}
 */
export default function CommentTrigger({
  count,
  latest,
  active,
  showTeaser,
  caret,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`${styles.trigger} ${active ? styles.triggerActive : ""}`}
      onClick={onClick}
      aria-expanded={active}
    >
      <span className={styles.triggerChip}>💬 {count}</span>
      {showTeaser && latest && (
        <span className={styles.teaser}>
          {latest.author === "adam" ? "Adam" : "Matt"}: {latest.body}
        </span>
      )}
      {caret && (
        <span
          className={`${styles.caret} ${active ? styles.caretOpen : ""}`}
          aria-hidden="true"
        >
          ⌄
        </span>
      )}
    </button>
  );
}

CommentTrigger.propTypes = {
  count: PropTypes.number.isRequired,
  latest: PropTypes.object,
  active: PropTypes.bool,
  showTeaser: PropTypes.bool,
  caret: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};
