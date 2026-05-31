"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";

/**
 * Creates the comments table if it does not exist.
 * Mirrors the idempotent pattern used by ensureSchema() for expenses.
 * `author` is a self-asserted display label ('adam' | 'matt'), not an identity —
 * there is no auth in this app. `edited` is a single flag flipped on update.
 */
export async function ensureCommentsSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id          SERIAL PRIMARY KEY,
      expense_id  INTEGER     NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      author      TEXT        NOT NULL,
      body        TEXT        NOT NULL,
      edited      BOOLEAN     NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS comments_expense_id_idx ON comments (expense_id)`;
}

/**
 * Fetches all comments for the trip, oldest first, grouped by expense id.
 * Volume is tiny (a 2-person trip), so a single eager query beats per-card fetches.
 * @return {Promise<Object<number, Array>>} Map of expense_id -> comment rows.
 */
export async function getCommentsByExpense() {
  await ensureCommentsSchema();
  const { rows } = await sql`
    SELECT id, expense_id, author, body, edited, created_at
    FROM comments
    ORDER BY created_at ASC, id ASC
  `;
  const byExpense = {};
  for (const row of rows) {
    (byExpense[row.expense_id] ||= []).push(row);
  }
  return byExpense;
}

/**
 * Validates comment input and throws on invalid data.
 * @param {string} author - 'adam' or 'matt'.
 * @param {string} body - Comment text.
 */
function validate(author, body) {
  if (!["adam", "matt"].includes(author)) throw new Error("Invalid author");
  if (!body || !body.trim()) throw new Error("Comment can't be empty");
}

/**
 * Adds a comment to an expense and returns the created row.
 * @param {Object} data
 * @param {number} data.expense_id
 * @param {string} data.author - Self-asserted label ('adam' | 'matt').
 * @param {string} data.body
 * @return {Promise<Object>} The inserted comment row.
 */
export async function addComment(data) {
  const expenseId = parseInt(data.expense_id);
  const author = data.author;
  const body = (data.body || "").trim();
  validate(author, body);
  if (!Number.isInteger(expenseId)) throw new Error("Invalid expense");
  await ensureCommentsSchema();
  const { rows } = await sql`
    INSERT INTO comments (expense_id, author, body)
    VALUES (${expenseId}, ${author}, ${body})
    RETURNING id, expense_id, author, body, edited, created_at
  `;
  revalidatePath("/misc/split-cost");
  return rows[0];
}

/**
 * Updates a comment's body and flags it as edited. Returns the updated row.
 * Edit/delete are intentionally unrestricted — there is no identity to gate on.
 * @param {number} id - Comment id.
 * @param {Object} data
 * @param {string} data.body - New comment text.
 * @return {Promise<Object>} The updated comment row.
 */
export async function updateComment(id, data) {
  const body = (data.body || "").trim();
  if (!body) throw new Error("Comment can't be empty");
  await ensureCommentsSchema();
  const { rows } = await sql`
    UPDATE comments SET body = ${body}, edited = true
    WHERE id = ${id}
    RETURNING id, expense_id, author, body, edited, created_at
  `;
  revalidatePath("/misc/split-cost");
  return rows[0];
}

/**
 * Deletes a comment by id.
 * @param {number} id - Comment id.
 */
export async function deleteComment(id) {
  await ensureCommentsSchema();
  await sql`DELETE FROM comments WHERE id = ${id}`;
  revalidatePath("/misc/split-cost");
}
