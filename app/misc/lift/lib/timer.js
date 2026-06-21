// Pure rest-timer helpers, shared by LiftPlan and the RestTimer bar. Kept free
// of React so the timer math can be reasoned about (and tested) on its own.

// localStorage key for the active rest timer (survives reloads / tab discards).
export const TIMER_KEY = "lift-timer";

// Circumference of the r=18 progress ring (2πr), used to drive strokeDashoffset.
export const RING_CIRCUMFERENCE = 113.1;

/**
 * Formats a second count as M:SS.
 * @param {number} s - Seconds remaining.
 * @return {string} The formatted time.
 */
export function fmt(s) {
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

/**
 * @param {Object|null} timer - Running timers carry endsAt; paused ones carry
 *   remaining, so the value is correct across sleep, throttling, and reloads.
 * @param {number} now - Wall-clock time in ms.
 * @return {number} Whole seconds left, floored at 0.
 */
export function getRemainingTimerDurationSeconds(timer, now) {
  if (!timer) return 0;
  if (timer.paused) return Math.max(0, timer.remaining);
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

/**
 * @param {*} timer - A timer restored from storage.
 * @return {boolean} Whether it is well-formed enough to resume.
 */
export function isValidTimer(timer) {
  if (!timer || typeof timer !== "object") return false;
  if (!Number.isFinite(timer.total)) return false;
  if (typeof timer.label !== "string") return false;
  if (typeof timer.paused !== "boolean") return false;
  return Number.isFinite(timer.paused ? timer.remaining : timer.endsAt);
}
