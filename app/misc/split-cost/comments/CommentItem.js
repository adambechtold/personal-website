"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import styles from "./comments.module.css";

const NAMES = { adam: "Adam", matt: "Matt" };

/**
 * Formats a timestamp as a short relative string (e.g. "2h", "3d"), falling
 * back to a short date for anything older than a week.
 * @param {string|Date} ts
 * @return {string}
 */
function relativeTime(ts) {
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * A single comment with inline view / edit states. Edit and delete are
 * unrestricted (no identity to gate on).
 * @param {Object} props
 * @param {Object} props.comment - Comment row.
 * @param {boolean} props.pending - Whether a mutation is in flight.
 * @param {function(number, string): Promise<void>} props.onEdit
 * @param {function(number): Promise<void>} props.onRemove
 * @return {React.ReactElement}
 */
export default function CommentItem({ comment, pending, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  async function save() {
    if (!draft.trim()) return;
    await onEdit(comment.id, draft);
    setEditing(false);
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.author}>{NAMES[comment.author] || comment.author}</span>
        <span className={styles.meta}>
          {relativeTime(comment.created_at)}
          {comment.edited ? " · edited" : ""}
        </span>
      </div>

      {editing ? (
        <div className={styles.editRow}>
          <textarea
            className={styles.editArea}
            value={draft}
            rows={2}
            autoFocus
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
          />
          <div className={styles.editBtns}>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={pending || !draft.trim()}
              onClick={save}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={pending}
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.body}>{comment.body}</div>
          <div className={styles.itemActions}>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={pending}
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.linkBtnDanger}
              disabled={pending}
              onClick={() => onRemove(comment.id)}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}

CommentItem.propTypes = {
  comment: PropTypes.object.isRequired,
  pending: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
