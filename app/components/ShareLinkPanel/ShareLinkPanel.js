"use client";

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { createShareLink, stopSharing } from "../../lib/shareLinkActions";
import styles from "./ShareLinkPanel.module.css";

/**
 * Owner-only panel for sharing one game or trip with friends: anyone with the
 * link can view and edit just that thing, without signing in. Resetting the
 * link makes the old one stop working.
 * @param {Object} props
 * @param {"scrabble"|"trip"} props.kind - What is being shared.
 * @param {string|number} props.target - The game id or trip slug.
 * @param {string|null} props.initialShareKey - The current key, if shared.
 * @return {React.ReactElement}
 */
export default function ShareLinkPanel({ kind, target, initialShareKey }) {
  const [shareKey, setShareKey] = useState(initialShareKey);
  const [origin, setOrigin] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const shareUrl = shareKey ? `${origin}/shared/${shareKey}` : "";

  /**
   * Runs an owner share action, tracking pending and error state.
   * @param {Function} performAction - Resolves to the new key (or null).
   */
  async function runAction(performAction) {
    setPending(true);
    setError("");
    setCopied(false);
    try {
      setShareKey(await performAction());
    } catch {
      setError("That didn't work — try again.");
    } finally {
      setPending(false);
    }
  }

  /** Copies the share URL to the clipboard. */
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("Couldn't copy — select the link and copy it by hand.");
    }
  }

  return (
    <Card className={styles.panel}>
      <div className={styles.heading}>Share with friends</div>
      {shareKey ? (
        <>
          <p className={styles.note}>
            Anyone with this link can view and edit this {labelFor(kind)} — no
            sign-in needed. They can&apos;t see or touch anything else.
          </p>
          <input
            className={styles.urlInput}
            readOnly
            value={shareUrl}
            aria-label="Share link"
            onFocus={(event) => event.target.select()}
          />
          <div className={styles.actions}>
            <Button size="sm" onClick={handleCopy} disabled={pending}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              onClick={() => runAction(() => createShareLink(kind, target))}
              disabled={pending}
            >
              Reset link
            </Button>
            <Button
              size="sm"
              onClick={() =>
                runAction(async () => {
                  await stopSharing(kind, target);
                  return null;
                })
              }
              disabled={pending}
            >
              Stop sharing
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <span className={styles.note}>Only you can see this.</span>
          <Button
            size="sm"
            onClick={() => runAction(() => createShareLink(kind, target))}
            disabled={pending}
          >
            {pending ? "Creating…" : "Create share link"}
          </Button>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </Card>
  );
}

/**
 * @param {string} kind - "scrabble" or "trip".
 * @return {string} How to refer to the shared thing in a sentence.
 */
function labelFor(kind) {
  return kind === "scrabble" ? "game" : "trip";
}

ShareLinkPanel.propTypes = {
  kind: PropTypes.oneOf(["scrabble", "trip"]).isRequired,
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  initialShareKey: PropTypes.string,
};
