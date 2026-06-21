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
 * @param {number[]} props.incA - Increment chip amounts.
 * @param {number[]} props.decA - Decrement chip amounts.
 * @param {Function} props.onAdjust - (delta) => void.
 * @param {Function} props.onType - (value) => void.
 * @param {Function} props.onClose - Close handler.
 * @return {React.ReactElement}
 */
export default function WeightEditor({
  label,
  value,
  unit,
  incA,
  decA,
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
            onChange={(e) => onType(e.target.value)}
          />
          <span className={styles.weightBigUnit}>{unit}</span>
        </div>
        <div className={styles.chipRow}>
          {decA.map((v) => (
            <Button
              key={v}
              variant="outlined"
              className={styles.chipMinus}
              onClick={() => onAdjust(-v)}
            >
              −{v}
            </Button>
          ))}
        </div>
        <div className={styles.chipRow}>
          {incA.map((v) => (
            <Button
              key={v}
              variant="accent"
              className={styles.chipPlus}
              onClick={() => onAdjust(v)}
            >
              +{v}
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
  incA: PropTypes.arrayOf(PropTypes.number).isRequired,
  decA: PropTypes.arrayOf(PropTypes.number).isRequired,
  onAdjust: PropTypes.func.isRequired,
  onType: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
