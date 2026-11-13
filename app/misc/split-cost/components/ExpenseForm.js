import React from "react";
import PropTypes from "prop-types";
import styles from "../split-cost.module.css";
import Button from "../../../components/ui/Button";
import { computePortions } from "../calc";
import { formatCurrency } from "../lib/format";

const CURRENCY_FLAGS = { USD: "🇺🇸", EUR: "🇪🇺", PHP: "🇵🇭" };

/**
 * The expense field set shared by both the add and edit forms: amount,
 * currency, description, payer, date, and the per-person shares/adjustments
 * grid with a live cost preview.
 * @param {Object} props
 * @param {Object} props.trip - The trip (people and currencies).
 * @param {Object} props.form - The form state.
 * @param {Function} props.setForm - Form state setter.
 * @param {Function} [props.onPayerPicked] - (personId) => void, called when
 *   the payer is chosen by hand.
 * @return {React.ReactElement}
 */
export default function ExpenseForm({ trip, form, setForm, onPayerPicked }) {
  const currency = form.currency || "USD";
  const portions = computePortions(form);

  /**
   * Updates one field of one person's split.
   * @param {string} personId - Whose split to change.
   * @param {string} field - "shares" or "adjustment".
   * @param {string} value - The new input value.
   */
  function setSplitField(personId, field, value) {
    setForm({
      ...form,
      splits: {
        ...form.splits,
        [personId]: { ...form.splits[personId], [field]: value },
      },
    });
  }

  return (
    <>
      <div className={styles.formRow}>
        <label className={styles.label}>Amount ({currency})</label>
        <input
          className={styles.input}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
          onBlur={(event) => {
            const parsed = parseFloat(event.target.value);
            if (!isNaN(parsed)) {
              setForm({ ...form, amount: parsed.toFixed(2) });
            }
          }}
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Currency</label>
        <div className={styles.pillRow}>
          {trip.currencies.map((currencyCode) => (
            <Button
              key={currencyCode}
              type="button"
              variant="pill"
              active={currency === currencyCode}
              onClick={() => setForm({ ...form, currency: currencyCode })}
            >
              {CURRENCY_FLAGS[currencyCode] || ""} {currencyCode}
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Description</label>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Dinner"
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Paid by</label>
        <div className={styles.pillRow}>
          {trip.people.map((person) => (
            <Button
              key={person.id}
              type="button"
              variant="pill"
              active={form.paid_by === person.id}
              onClick={() => {
                setForm({ ...form, paid_by: person.id });
                if (onPayerPicked) onPayerPicked(person.id);
              }}
            >
              {person.name}
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Date</label>
        <input
          className={styles.input}
          type="date"
          value={form.expense_date}
          onChange={(event) =>
            setForm({ ...form, expense_date: event.target.value })
          }
          required
        />
      </div>
      <div
        className={styles.sharesGrid}
        style={{
          gridTemplateColumns: `auto repeat(${trip.people.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {trip.people.map((person) => (
          <div key={person.id} className={styles.sharesColHeader}>
            {person.name}
          </div>
        ))}
        <div className={styles.sharesRowLabel}>Shares</div>
        {trip.people.map((person) => (
          <input
            key={person.id}
            className={`${styles.input} ${styles.inputSm}`}
            type="number"
            min="0"
            step="1"
            aria-label={`${person.name} shares`}
            value={form.splits[person.id].shares}
            onChange={(event) =>
              setSplitField(person.id, "shares", event.target.value)
            }
          />
        ))}
        <div className={styles.sharesRowLabel}>+/-</div>
        {trip.people.map((person) => (
          <input
            key={person.id}
            className={`${styles.input} ${styles.inputSm}`}
            type="number"
            step="0.01"
            placeholder="0"
            aria-label={`${person.name} adjustment`}
            value={form.splits[person.id].adjustment}
            onChange={(event) =>
              setSplitField(person.id, "adjustment", event.target.value)
            }
          />
        ))}
        <div className={styles.sharesRowLabel}>Cost</div>
        {trip.people.map((person) => (
          <div key={person.id} className={styles.sharesCostValue}>
            {formatCurrency(portions[person.id] || 0, currency)}
          </div>
        ))}
      </div>
    </>
  );
}

ExpenseForm.propTypes = {
  trip: PropTypes.object.isRequired,
  onPayerPicked: PropTypes.func,
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
};
