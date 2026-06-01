"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import styles from "./comments.module.css";
import CommentTrigger from "./CommentTrigger";
import CommentThread from "./CommentThread";

/**
 * Shell A — inline accordion. The trigger sits on the card; tapping it expands
 * the shared thread in place, directly below. Same layout on desktop and mobile
 * (the page is a single ~500px column either way).
 * @param {Object} props
 * @param {ReturnType<import('./useComments').useComments>} props.thread
 * @return {React.ReactElement}
 */
export default function InlineComments({ thread }) {
  const [open, setOpen] = useState(false);
  const { comments } = thread;
  const latest = comments[comments.length - 1];

  return (
    <div className={styles.inlineWrap}>
      <CommentTrigger
        count={comments.length}
        latest={latest}
        active={open}
        showTeaser={!open}
        caret
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div className={styles.inlinePanel}>
          <CommentThread thread={thread} />
        </div>
      )}
    </div>
  );
}

InlineComments.propTypes = {
  thread: PropTypes.object.isRequired,
};
