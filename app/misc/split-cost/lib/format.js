// Pure formatting + date helpers for the trip tracker. No React, no DB.

// Today as YYYY-MM-DD, used to seed new expense dates.
export const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Formats an amount in a given currency for display.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code.
 * @return {string}
 */
export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a YYYY-MM-DD date string for display.
 * @param {string} dateString - Date string in YYYY-MM-DD format.
 * @return {string} Formatted date (e.g. "Jun 15").
 */
export function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Coerces a DB date value (Date or string) to a YYYY-MM-DD string.
 * @param {Date|string} date - The date value.
 * @return {string} The YYYY-MM-DD string.
 */
export function toDateString(date) {
  return typeof date === "string" ? date : date.toISOString().slice(0, 10);
}
