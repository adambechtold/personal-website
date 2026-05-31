"use client";

import PropTypes from "prop-types";
import styles from "./comments.module.css";
import CommentItem from "./CommentItem";
import CommentComposer from "./CommentComposer";

/**
 * Shared, presentation-agnostic comment thread body: the list of comments plus
 * the composer. Both the inline and sheet shells render this identically — it
 * takes a `useComments` bundle as props and renders no chrome of its own.
 * @param {Object} props
 * @param {ReturnType<import('./useComments').useComments>} props.thread
 * @return {React.ReactElement}
 */
export default function CommentThread({ thread }) {
  const { comments, author, setAuthor, pending, add, edit, remove } = thread;

  return (
    <div className={styles.thread}>
      {comments.length === 0 ? (
        <p className={styles.empty}>No comments yet.</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              pending={pending}
              onEdit={edit}
              onRemove={remove}
            />
          ))}
        </ul>
      )}
      <CommentComposer
        author={author}
        setAuthor={setAuthor}
        pending={pending}
        onAdd={add}
      />
    </div>
  );
}

CommentThread.propTypes = {
  thread: PropTypes.object.isRequired,
};
