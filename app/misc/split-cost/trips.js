/**
 * The hard-coded list of trips the split-cost tracker knows about.
 *
 * Each trip has its own URL (`/misc/split-cost/<slug>`), its own set of people,
 * and the currencies offered in its expense form. Expenses are stored in one
 * shared `expenses` table and scoped to a trip by its slug, so a slug must
 * never be changed once a trip has expenses. The same goes for people: stored
 * expenses reference person ids, so never rename or remove a person from a
 * trip that has expenses (their payments and portions would silently drop out
 * of the settlement). Adding a person is safe.
 *
 * To add a trip, add an entry here — no schema change is needed.
 */
export const TRIPS = [
  {
    slug: "ireland",
    name: "Ireland Trip",
    emoji: "🇮🇪",
    people: [
      { id: "adam", name: "Adam" },
      { id: "matt", name: "Matt" },
    ],
    currencies: ["USD", "EUR"],
  },
  {
    slug: "manila",
    name: "Manila Trip",
    emoji: "🇵🇭",
    people: [
      { id: "adam", name: "Adam" },
      { id: "adela", name: "Adela" },
      { id: "tia", name: "Tia" },
      { id: "chris", name: "Chris" },
    ],
    currencies: ["USD", "PHP"],
  },
];

/**
 * Looks up a trip by its URL slug.
 * @param {string} slug - The trip slug (e.g. "manila").
 * @return {Object|undefined} The trip, or undefined when no trip matches.
 */
export function findTrip(slug) {
  return TRIPS.find((trip) => trip.slug === slug);
}

/**
 * Looks up a person's display name within a trip.
 * @param {Object} trip - The trip.
 * @param {string} personId - The person's id (e.g. "adam").
 * @return {string} The display name, or the raw id for an unknown person.
 */
export function personName(trip, personId) {
  const person = trip.people.find((candidate) => candidate.id === personId);
  return person ? person.name : personId;
}
