"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import styles from "./comments.module.css";

/**
 * Comment input with a self-asserted author toggle. Enter submits;
 * Shift+Enter inserts a newline.
 * @param {Object} props
 * @param {'adam'|'matt'} props.author
 * @param {function('adam'|'matt')} props.setAuthor
 * @param {boolean} props.pending
 * @param {function(string): Promise<void>} props.onAdd
 * @return {React.ReactElement}
 */
export default function CommentComposer({ author, setAuthor, pending, onAdd }) {
  const [draft, setDraft] = useState("");

  async function submit() {
    if (!draft.trim()) return;
    await onAdd(draft);
    setDraft("");
  }

  return (
    <div className={styles.composer}>
      <div className={styles.composerTop}>
        <span className={styles.asLabel}>Comment as</span>
        <div className={styles.authorToggle}>
          {["adam", "matt"].map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.authorBtn} ${author === p ? styles.authorBtnActive : ""}`}
              onClick={() => setAuthor(p)}
            >
              {p === "adam" ? "Adam" : "Matt"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.composerRow}>
        <textarea
          className={styles.composerInput}
          placeholder="Add a comment…"
          rows={1}
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className={styles.sendBtn}
          disabled={pending || !draft.trim()}
          onClick={submit}
        >
          Send
        </button>
      </div>
    </div>
  );
}

CommentComposer.propTypes = {
  author: PropTypes.oneOf(["adam", "matt"]).isRequired,
  setAuthor: PropTypes.func.isRequired,
  pending: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
};
