"use server";

import { verifyPassword } from "../lib/session";
import { createSession } from "../lib/auth";

/**
 * Verifies the shared password and, on success, mints a session cookie.
 * Returns an error message instead of throwing so the form can show it.
 * @param {string} password - The submitted password.
 * @return {Promise<{ok: true} | {error: string}>} The result.
 */
export async function login(password) {
  if (!(await verifyPassword(password))) {
    return { error: "Incorrect password." };
  }
  await createSession();
  return { ok: true };
}
