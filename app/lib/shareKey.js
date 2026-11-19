// Pure helpers for share-link keys. Kept free of database and Next imports so
// they can be unit-tested and used from any runtime.

// 16 random bytes, base64url-encoded without padding, is 22 characters.
const SHARE_KEY_BYTE_LENGTH = 16;
const SHARE_KEY_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** The kinds of thing a share link can grant access to. */
export const SHARE_KINDS = ["scrabble", "trip"];

/**
 * Mints a new, unguessable share key (128 bits of randomness).
 * @return {string} The key.
 */
export function generateShareKey() {
  const bytes = new Uint8Array(SHARE_KEY_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Whether a value could be a share key. Lets junk input be turned away
 * without a database query.
 * @param {*} shareKey - The untrusted value.
 * @return {boolean} Whether it has the shape of a share key.
 */
export function isWellFormedShareKey(shareKey) {
  return typeof shareKey === "string" && SHARE_KEY_PATTERN.test(shareKey);
}

/**
 * Whether a value names a kind of share link.
 * @param {*} kind - The untrusted value.
 * @return {boolean} Whether it is one of SHARE_KINDS.
 */
export function isShareKind(kind) {
  return SHARE_KINDS.includes(kind);
}
