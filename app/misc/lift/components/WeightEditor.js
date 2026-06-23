import React from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

/**
 * Modal weight editor: a big numeric field plus unit-aware increment chips.
 * Edits cascade to the sets below (handled by the parent's onType/onAdjust).
 * @param {Object} props
 * @param {string} props.label - Eyebrow label (exercise + set).
 * @param {string} props.value - Current weight value.
 * @param {string} props.unit - Weight unit label.
 * @param {number[]} props.weightIncrements - Increment chip amounts.
 * @param {number[]} props.weightDecrements - Decrement chip amounts.
 * @param {Function} props.onAdjust - (delta) => void.
 * @param {Function} props.onType - (value) => void.
 * @param {Function} props.onClose - Close handler.
 * @return {React.ReactElement}
 */
export default function WeightEditor({
  label,
  value,
  unit,
  weightIncrements,
  weightDecrements,
  onAdjust,
  onType,
  onClose,
}) {
  return (
    <div className={styles.modalWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <Card className={styles.weightDialog}>
        <div className={styles.weightEyebrow}>{label}</div>
        <div className={styles.weightBigRow}>
          <input
            className={styles.weightBig}
            value={value}
            inputMode="decimal"
            placeholder="0"
            onChange={(event) => onType(event.target.value)}
          />
          <span className={styles.weightBigUnit}>{unit}</span>
        </div>
        <div className={styles.chipRow}>
          {weightDecrements.map((amount) => (
            <Button
              key={amount}
              variant="outlined"
              className={styles.chipMinus}
              onClick={() => onAdjust(-amount)}
            >
              −{amount}
            </Button>
          ))}
        </div>
        <div className={styles.chipRow}>
          {weightIncrements.map((amount) => (
            <Button
              key={amount}
              variant="accent"
              className={styles.chipPlus}
              onClick={() => onAdjust(amount)}
            >
              +{amount}
            </Button>
          ))}
        </div>
        <div className={styles.weightHelp}>
          Applies here and to the sets below that aren&apos;t done yet.
        </div>
        <Button
          variant="primary"
          className={styles.weightDone}
          onClick={onClose}
        >
          Done
        </Button>
      </Card>
    </div>
  );
}

WeightEditor.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  unit: PropTypes.string.isRequired,
  weightIncrements: PropTypes.arrayOf(PropTypes.number).isRequired,
  weightDecrements: PropTypes.arrayOf(PropTypes.number).isRequired,
  onAdjust: PropTypes.func.isRequired,
  onType: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
