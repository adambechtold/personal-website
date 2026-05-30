/**
 * Pure currency-rate helpers — no database, no network.
 * Kept dependency-free so the date/currency logic is unit-testable in isolation.
 */

/**
 * Builds the Frankfurter URL for a currency on a given date.
 * @param {string} currency - ISO 4217 currency code (the "from" currency).
 * @param {string} date - YYYY-MM-DD date string.
 * @return {string} The request URL converting `currency` to USD.
 */
export function buildRateUrl(currency, date) {
  return `https://api.frankfurter.dev/v1/${date}?from=${currency}&to=USD`;
}

/**
 * Parses a Frankfurter response into a rate result.
 * Throws if the USD rate is missing or malformed so nothing is stored with a bad rate.
 * @param {Object} data - Parsed JSON body from Frankfurter.
 * @return {{rateToBase: number, rateDate: string}} The USD rate and the market date it is from.
 */
export function parseRateResponse(data) {
  if (!data || typeof data.rates?.USD !== "number") {
    throw new Error("Unexpected response shape");
  }
  return { rateToBase: data.rates.USD, rateDate: data.date };
}

/**
 * Cache-first rate resolver. USD short-circuits with no I/O. Otherwise reads the
 * cache for the requested currency/date; on a miss it fetches, writes through, and
 * returns the fresh rate. Dependencies are injected so this is pure and testable.
 * @param {string} currency - ISO 4217 currency code.
 * @param {string} date - YYYY-MM-DD expense date (the requested "as of" date).
 * @param {Object} deps - Injected dependencies.
 * @param {Function} deps.readCache - (currency, date) => Promise of a cached rate or null.
 * @param {Function} deps.writeCache - (currency, date, rate) => Promise that stores the rate.
 * @param {Function} deps.fetchRate - (currency, date) => Promise of a freshly fetched rate.
 * @return {Promise<{rateToBase: number, rateDate: string}>} The resolved rate.
 */
export async function resolveRate(
  currency,
  date,
  { readCache, writeCache, fetchRate }
) {
  if (currency === "USD") return { rateToBase: 1, rateDate: date };
  const cached = await readCache(currency, date);
  if (cached) return cached;
  const fresh = await fetchRate(currency, date);
  await writeCache(currency, date, fresh);
  return fresh;
}
