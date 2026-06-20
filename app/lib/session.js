// Shared, runtime-agnostic session crypto. Imported by both the Edge
// middleware and Node server actions, so it must avoid `next/headers` and any
// Node-only APIs — only the Web Crypto + global `btoa`/`process.env` that both
// runtimes provide.

export const COOKIE_NAME = "app_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

const encoder = new TextEncoder();

/**
 * @return {string} The HMAC signing secret.
 * @throws {Error} If AUTH_SECRET is not configured.
 */
function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

/**
 * URL-safe, unpadded base64 of a byte array.
 * @param {Uint8Array} bytes - The bytes to encode.
 * @return {string} The base64url string.
 */
function base64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * HMAC-SHA256 of a message under AUTH_SECRET.
 * @param {string} message - The message to sign.
 * @return {Promise<string>} The base64url signature.
 */
async function hmac(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64url(new Uint8Array(sig));
}

/**
 * Constant-time compare of two equal-length strings. Bails fast only on a
 * length mismatch (which is not secret here), otherwise compares every char.
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @return {boolean} Whether they are equal.
 */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Mints a signed session token of the form `${expiresAt}.${signature}`.
 * @return {Promise<string>} The token.
 */
export async function signToken() {
  const payload = String(Date.now() + SESSION_TTL_MS);
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

/**
 * Verifies a session token's signature and expiry.
 * @param {string|undefined} token - The cookie value.
 * @return {Promise<boolean>} Whether the token is valid and unexpired.
 */
export async function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, await hmac(payload))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * SHA-256 of a string, base64url-encoded. Used to equalize length before a
 * constant-time password compare.
 * @param {string} input - The string to hash.
 * @return {Promise<string>} The digest.
 */
async function sha256(input) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return base64url(new Uint8Array(digest));
}

/**
 * Constant-time check of a submitted password against APP_PASSWORD.
 * @param {string} input - The submitted password.
 * @return {Promise<boolean>} Whether it matches.
 * @throws {Error} If APP_PASSWORD is not configured.
 */
export async function verifyPassword(input) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set");
  if (typeof input !== "string") return false;
  return safeEqual(await sha256(input), await sha256(expected));
}
