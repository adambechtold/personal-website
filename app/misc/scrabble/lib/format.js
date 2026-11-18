/**
 * The name to show for a game, falling back to its players when unnamed.
 * @param {{name: string, players: Array<string>}} game - The game.
 * @return {string} The display name.
 */
export function gameDisplayName(game) {
  return game.name || game.players.join(", ");
}

/**
 * Formats an ISO timestamp as a short date, e.g. "Nov 18, 2026".
 * @param {string} isoTimestamp - The timestamp.
 * @return {string} The formatted date.
 */
export function formatDate(isoTimestamp) {
  return new Date(isoTimestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
