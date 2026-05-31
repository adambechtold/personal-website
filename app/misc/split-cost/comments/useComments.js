"use client";

import { useState, useEffect, useCallback } from "react";
import { addComment, updateComment, deleteComment } from "./actions";

const AUTHOR_KEY = "comment-author";

/**
 * Headless comment logic for a single expense. Owns local (optimistic) state,
 * the self-asserted author selection, and the CRUD calls. Renders nothing —
 * presentation shells consume this and decide how to display the thread.
 *
 * Author note: this is a self-asserted label, not an identity. There is no auth,
 * so it lives in its own localStorage key (independent of the expense form's
 * "paid by" default) and edit/delete are unrestricted.
 *
 * @param {number} expenseId - The expense these comments belong to.
 * @param {Array} initialComments - Server-rendered comments for this expense.
 * @return {{
 *   comments: Array,
 *   author: 'adam'|'matt',
 *   setAuthor: function,
 *   pending: boolean,
 *   add: function(string): Promise<void>,
 *   edit: function(number, string): Promise<void>,
 *   remove: function(number): Promise<void>,
 * }}
 */
export function useComments(expenseId, initialComments = []) {
  const [comments, setComments] = useState(initialComments);
  const [author, setAuthorState] = useState("adam");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(AUTHOR_KEY);
    if (saved === "adam" || saved === "matt") setAuthorState(saved);
  }, []);

  const setAuthor = useCallback((next) => {
    setAuthorState(next);
    localStorage.setItem(AUTHOR_KEY, next);
  }, []);

  const add = useCallback(
    async (body) => {
      const text = (body || "").trim();
      if (!text) return;
      setPending(true);
      try {
        const created = await addComment({
          expense_id: expenseId,
          author,
          body: text,
        });
        setComments((prev) => [...prev, created]);
      } catch (err) {
        alert("Failed to add comment: " + err.message);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [expenseId, author]
  );

  const edit = useCallback(async (id, body) => {
    const text = (body || "").trim();
    if (!text) return;
    setPending(true);
    try {
      const updated = await updateComment(id, { body: text });
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      alert("Failed to update comment: " + err.message);
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm("Delete this comment?")) return;
    setPending(true);
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete comment: " + err.message);
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  return { comments, author, setAuthor, pending, add, edit, remove };
}
