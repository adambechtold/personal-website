"use client";

import PropTypes from "prop-types";
import { useComments } from "./useComments";
import InlineComments from "./InlineComments";
import CommentSheet from "./CommentSheet";

/**
 * Strategy switch between the two prototype presentations. The data layer
 * (useComments) and the thread body (CommentThread) are shared; only the shell
 * differs, so swapping approaches is a one-prop change driven from here.
 * @param {Object} props
 * @param {number} props.expenseId
 * @param {Array} props.initialComments
 * @param {'inline'|'sheet'} props.mode
 * @param {string} [props.label] - Expense description (used by the sheet header).
 * @return {React.ReactElement}
 */
export default function Comments({ expenseId, initialComments, mode, label }) {
  const thread = useComments(expenseId, initialComments);

  if (mode === "sheet") {
    return <CommentSheet thread={thread} label={label} />;
  }
  return <InlineComments thread={thread} />;
}

Comments.propTypes = {
  expenseId: PropTypes.number.isRequired,
  initialComments: PropTypes.array,
  mode: PropTypes.oneOf(["inline", "sheet"]),
  label: PropTypes.string,
};
