import React from "react";
import Link from "next/link";
import styles from "./split-cost.module.css";
import Card from "../../components/ui/Card";
import { TRIPS } from "./trips";

export const metadata = {
  title: "Trips",
  description: "Trip expense trackers.",
};

/**
 * Split-cost index — lists every trip and links to its tracker.
 * @return {React.ReactElement} The rendered page.
 */
export default function SplitCostIndexPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Trips</h1>
        <div className={styles.tripList}>
          {TRIPS.map((trip) => (
            <Link
              key={trip.slug}
              href={`/misc/split-cost/${trip.slug}`}
              className={styles.tripLink}
            >
              <Card>
                <div className={styles.tripName}>
                  {trip.emoji} {trip.name}
                </div>
                <div className={styles.tripPeople}>
                  {trip.people.map((person) => person.name).join(", ")}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
