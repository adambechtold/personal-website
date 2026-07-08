import React, { useState } from "react";
import PropTypes from "prop-types";
import styles from "../lift.module.css";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { computePlates } from "../lib/plates";

/**
 * Modal weight editor: a big numeric field plus unit-aware increment chips.
 * Edits cascade to the sets below (handled by the parent's onType/onAdjust).
 * A plate-calculator toggle next to the weight breaks the current total down
 * into the plates to load on each side of the barbell.
 * @param {Object} props
 * @param {string} props.label - Eyebrow label (exercise + set).
 * @param {string} props.value - Current weight value.
 * @param {string} props.unit - Weight unit label.
 * @param {number[]} props.weightIncrements - Increment chip amounts.
 * @param {number[]} props.weightDecrements - Decrement chip amounts.
 * @param {{barWeight: number, plateSizes: number[]}} props.plateConfig - Bar
 *   weight and available plate sizes for the plate calculator.
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
  plateConfig,
  onAdjust,
  onType,
  onClose,
}) {
  const [showPlates, setShowPlates] = useState(false);
  const plates = computePlates(value, plateConfig);

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
        <div className={styles.plateToggleRow}>
          <Button
            variant="pill"
            size="sm"
            active={showPlates}
            onClick={() => setShowPlates((current) => !current)}
            aria-pressed={showPlates}
          >
            Plate calculator
          </Button>
        </div>
        {showPlates && <PlateBreakdown plates={plates} unit={unit} />}
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

/**
 * Renders the plate calculator result: a per-side list of plates, or a hint
 * when the weight is blank, below the bar, or can't be matched exactly.
 * @param {Object} props
 * @param {Object} props.plates - The breakdown from computePlates.
 * @param {string} props.unit - Weight unit label.
 * @return {React.ReactElement}
 */
function PlateBreakdown({ plates, unit }) {
  if (plates.empty) {
    return (
      <div className={styles.plateBox}>
        <div className={styles.plateHint}>
          Enter a weight to see the plates per side.
        </div>
      </div>
    );
  }
  if (plates.belowBar) {
    return (
      <div className={styles.plateBox}>
        <div className={styles.plateHint}>
          Below the {plates.barWeight} {unit} bar.
        </div>
      </div>
    );
  }
  return (
    <div className={styles.plateBox}>
      <div className={styles.plateEyebrow}>
        Per side · {plates.barWeight} {unit} bar
      </div>
      {plates.perSide.length === 0 ? (
        <div className={styles.plateHint}>Just the bar.</div>
      ) : (
        <div className={styles.plateList}>
          {plates.perSide.map((entry) => (
            <span key={entry.plateSize} className={styles.platePill}>
              {entry.plateSize}
              <span className={styles.platePillTimes}>×{entry.count}</span>
            </span>
          ))}
        </div>
      )}
      {!plates.isExact && (
        <div className={styles.plateRemainder}>
          +{plates.remainderPerSide} {unit} per side needs another plate.
        </div>
      )}
    </div>
  );
}

PlateBreakdown.propTypes = {
  plates: PropTypes.shape({
    empty: PropTypes.bool.isRequired,
    belowBar: PropTypes.bool.isRequired,
    barWeight: PropTypes.number.isRequired,
    perSide: PropTypes.arrayOf(
      PropTypes.shape({
        plateSize: PropTypes.number.isRequired,
        count: PropTypes.number.isRequired,
      })
    ).isRequired,
    remainderPerSide: PropTypes.number.isRequired,
    isExact: PropTypes.bool.isRequired,
  }).isRequired,
  unit: PropTypes.string.isRequired,
};

WeightEditor.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  unit: PropTypes.string.isRequired,
  weightIncrements: PropTypes.arrayOf(PropTypes.number).isRequired,
  weightDecrements: PropTypes.arrayOf(PropTypes.number).isRequired,
  plateConfig: PropTypes.shape({
    barWeight: PropTypes.number.isRequired,
    plateSizes: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  onAdjust: PropTypes.func.isRequired,
  onType: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
