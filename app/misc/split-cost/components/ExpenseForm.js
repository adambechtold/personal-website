import React from "react";
import PropTypes from "prop-types";
import styles from "../split-cost.module.css";
import Button from "../../../components/ui/Button";
import { computePortions } from "../calc";
import { formatCurrency } from "../lib/format";

const CURRENCIES = ["USD", "EUR"];

const CURRENCY_FLAGS = { USD: "🇺🇸", EUR: "🇪🇺" };

/**
 * The expense field set shared by both the add and edit forms: amount,
 * currency, description, payer, date, and the per-person shares/adjustments
 * grid with a live cost preview.
 * @param {{form: Object, setForm: Function}} props
 * @return {React.ReactElement}
 */
export default function ExpenseForm({ form, setForm }) {
  const currency = form.currency || "USD";
  const { adamPortion: aCost, mattPortion: mCost } = computePortions(form);
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
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          onBlur={(e) => {
            const parsed = parseFloat(e.target.value);
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
          {CURRENCIES.map((c) => (
            <Button
              key={c}
              type="button"
              variant="pill"
              active={currency === c}
              onClick={() => setForm({ ...form, currency: c })}
            >
              {CURRENCY_FLAGS[c]} {c}
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
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Paid by</label>
        <div className={styles.pillRow}>
          {["adam", "matt"].map((p) => (
            <Button
              key={p}
              type="button"
              variant="pill"
              active={form.paid_by === p}
              onClick={() => {
                setForm({ ...form, paid_by: p });
                localStorage.setItem("trip-person", p);
              }}
            >
              {p === "adam" ? "Adam" : "Matt"}
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
          onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          required
        />
      </div>
      <div className={styles.sharesGrid}>
        <div />
        <div className={styles.sharesColHeader}>Adam</div>
        <div className={styles.sharesColHeader}>Matt</div>
        <div className={styles.sharesRowLabel}>Shares</div>
        <input
          className={`${styles.input} ${styles.inputSm}`}
          type="number"
          min="0"
          step="1"
          value={form.adam_shares}
          onChange={(e) => setForm({ ...form, adam_shares: e.target.value })}
        />
        <input
          className={`${styles.input} ${styles.inputSm}`}
          type="number"
          min="0"
          step="1"
          value={form.matt_shares}
          onChange={(e) => setForm({ ...form, matt_shares: e.target.value })}
        />
        <div className={styles.sharesRowLabel}>+/-</div>
        <input
          className={`${styles.input} ${styles.inputSm}`}
          type="number"
          step="0.01"
          placeholder="0"
          value={form.adam_adjustment}
          onChange={(e) =>
            setForm({ ...form, adam_adjustment: e.target.value })
          }
        />
        <input
          className={`${styles.input} ${styles.inputSm}`}
          type="number"
          step="0.01"
          placeholder="0"
          value={form.matt_adjustment}
          onChange={(e) =>
            setForm({ ...form, matt_adjustment: e.target.value })
          }
        />
        <div className={styles.sharesRowLabel}>Cost</div>
        <div className={styles.sharesCostValue}>
          {formatCurrency(aCost, currency)}
        </div>
        <div className={styles.sharesCostValue}>
          {formatCurrency(mCost, currency)}
        </div>
      </div>
    </>
  );
}

ExpenseForm.propTypes = {
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
};
