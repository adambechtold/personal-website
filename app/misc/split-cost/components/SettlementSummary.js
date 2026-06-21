import React from "react";
import PropTypes from "prop-types";
import styles from "../split-cost.module.css";
import Card from "../../../components/ui/Card";

/**
 * The settlement summary card: the headline "who owes whom" line plus the
 * per-person paid / share / net breakdown.
 * @param {{settlement: Object, settlementLine: string}} props
 * @return {React.ReactElement}
 */
export default function SettlementSummary({ settlement, settlementLine }) {
  return (
    <Card accent className={styles.settlement}>
      <div className={styles.settlementLine}>{settlementLine}</div>
      <div className={styles.settlementBreakdown}>
        <div className={`${styles.settlementRow} ${styles.settlementHeader}`}>
          <span></span>
          <span>Paid</span>
          <span>Share</span>
          <span>Net</span>
        </div>
        <div className={styles.settlementRow}>
          <span>Adam</span>
          <span>${settlement.adamPaid.toFixed(2)}</span>
          <span>${settlement.adamOwed.toFixed(2)}</span>
          <span
            className={
              settlement.adamNet >= 0 ? styles.positive : styles.negative
            }
          >
            {settlement.adamNet >= 0 ? "+" : ""}${settlement.adamNet.toFixed(2)}
          </span>
        </div>
        <div className={styles.settlementRow}>
          <span>Matt</span>
          <span>${settlement.mattPaid.toFixed(2)}</span>
          <span>${settlement.mattOwed.toFixed(2)}</span>
          <span
            className={
              settlement.mattNet >= 0 ? styles.positive : styles.negative
            }
          >
            {settlement.mattNet >= 0 ? "+" : ""}${settlement.mattNet.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
}

SettlementSummary.propTypes = {
  settlement: PropTypes.object.isRequired,
  settlementLine: PropTypes.string.isRequired,
};
