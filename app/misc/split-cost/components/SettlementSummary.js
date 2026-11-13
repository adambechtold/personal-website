import React from "react";
import PropTypes from "prop-types";
import styles from "../split-cost.module.css";
import Card from "../../../components/ui/Card";

/**
 * The settlement summary card: the headline "who owes whom" lines plus the
 * per-person paid / share / net breakdown.
 * @param {{trip: Object, settlement: Object, settlementLines: Array<string>}}
 *   props
 * @return {React.ReactElement}
 */
export default function SettlementSummary({
  trip,
  settlement,
  settlementLines,
}) {
  return (
    <Card accent className={styles.settlement}>
      <div className={styles.settlementLines}>
        {settlementLines.map((settlementLine) => (
          <div key={settlementLine} className={styles.settlementLine}>
            {settlementLine}
          </div>
        ))}
      </div>
      <div className={styles.settlementBreakdown}>
        <div className={`${styles.settlementRow} ${styles.settlementHeader}`}>
          <span></span>
          <span>Paid</span>
          <span>Share</span>
          <span>Net</span>
        </div>
        {trip.people.map((person) => {
          const totals = settlement[person.id];
          // Round first so a sub-cent negative net doesn't render as "$-0.00".
          const netCents = Math.round(totals.net * 100);
          return (
            <div key={person.id} className={styles.settlementRow}>
              <span>{person.name}</span>
              <span>${totals.paid.toFixed(2)}</span>
              <span>${totals.owed.toFixed(2)}</span>
              <span
                className={netCents >= 0 ? styles.positive : styles.negative}
              >
                {netCents >= 0 ? "+" : "-"}$
                {(Math.abs(netCents) / 100).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

SettlementSummary.propTypes = {
  trip: PropTypes.object.isRequired,
  settlement: PropTypes.object.isRequired,
  settlementLines: PropTypes.arrayOf(PropTypes.string).isRequired,
};
