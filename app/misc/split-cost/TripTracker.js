"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "./split-cost.module.css";
import { addExpense, updateExpense, deleteExpense } from "./actions";

const TODAY = new Date().toISOString().slice(0, 10);

const CURRENCIES = ["USD", "EUR"];

const CURRENCY_FLAGS = { USD: "🇺🇸", EUR: "🇪🇺" };

const EMPTY_FORM = {
  description: "",
  amount: "",
  expense_date: TODAY,
  paid_by: "adam",
  currency: "USD",
  adam_shares: "1",
  matt_shares: "1",
  adam_adjustment: "0",
  matt_adjustment: "0",
};

/**
 * Formats an amount in a given currency for display.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code.
 * @return {string}
 */
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Computes adam's and matt's portion for a single expense (in transaction currency).
 * @param {Object} exp - Expense row.
 * @return {{adamPortion: number, mattPortion: number}}
 */
function computePortions(exp) {
  const amount = parseFloat(exp.amount);
  const adamShares = parseInt(exp.adam_shares);
  const mattShares = parseInt(exp.matt_shares);
  const adamAdj = parseFloat(exp.adam_adjustment);
  const mattAdj = parseFloat(exp.matt_adjustment);
  const totalShares = adamShares + mattShares;
  const remaining = amount - adamAdj - mattAdj;
  const adamPortion =
    totalShares > 0
      ? (adamShares / totalShares) * remaining + adamAdj
      : adamAdj;
  const mattPortion =
    totalShares > 0
      ? (mattShares / totalShares) * remaining + mattAdj
      : mattAdj;
  return { adamPortion, mattPortion };
}

/**
 * Computes settlement totals across all expenses, converting to USD via rate_to_base.
 * @param {Array} expenses - All expense rows.
 * @return {{adamPaid: number, mattPaid: number, adamOwed: number, mattOwed: number, adamNet: number, mattNet: number}}
 */
function computeSettlement(expenses) {
  let adamPaid = 0;
  let mattPaid = 0;
  let adamOwed = 0;
  let mattOwed = 0;
  for (const exp of expenses) {
    const amount = parseFloat(exp.amount);
    const rate = parseFloat(exp.rate_to_base) || 1;
    if (exp.paid_by === "adam") adamPaid += amount * rate;
    else mattPaid += amount * rate;
    const { adamPortion, mattPortion } = computePortions(exp);
    adamOwed += adamPortion * rate;
    mattOwed += mattPortion * rate;
  }
  return {
    adamPaid,
    mattPaid,
    adamOwed,
    mattOwed,
    adamNet: adamPaid - adamOwed,
    mattNet: mattPaid - mattOwed,
  };
}

/**
 * Formats a YYYY-MM-DD date string for display.
 * @param {string} dateStr - Date string in YYYY-MM-DD format.
 * @return {string} Formatted date (e.g. "Jun 15").
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Trip tracker client component for the Ireland trip.
 * @param {{initialExpenses: Array}} props
 * @return {React.ReactElement}
 */
export default function TripTracker({ initialExpenses }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [pending, setPending] = useState(false);
  const [filterUser, setFilterUser] = useState("all");
  const [sort, setSort] = useState({ field: "date_added", dir: "desc" });

  useEffect(() => {
    const saved = localStorage.getItem("trip-person");
    if (saved === "adam" || saved === "matt") setForm((f) => ({ ...f, paid_by: saved }));
  }, []);

  const settlement = computeSettlement(initialExpenses);
  const { adamNet } = settlement;

  let settlementLine;
  if (Math.abs(adamNet) < 0.01) {
    settlementLine = "All settled up 🎉";
  } else if (adamNet > 0) {
    settlementLine = `Matt owes Adam $${adamNet.toFixed(2)}`;
  } else {
    settlementLine = `Adam owes Matt $${(-adamNet).toFixed(2)}`;
  }

  /**
   * Handles add-expense form submission.
   * @param {React.FormEvent} e
   */
  async function handleAdd(e) {
    e.preventDefault();
    setPending(true);
    try {
      await addExpense(form);
      window.location.reload();
    } catch (err) {
      alert("Failed to add expense: " + err.message);
      setPending(false);
    }
  }

  /**
   * Handles edit-expense form submission.
   * @param {React.FormEvent} e
   */
  async function handleUpdate(e) {
    e.preventDefault();
    setPending(true);
    try {
      await updateExpense(editId, editForm);
      window.location.reload();
    } catch (err) {
      alert("Failed to update expense: " + err.message);
      setPending(false);
    }
  }

  /**
   * Handles delete button for an expense.
   * @param {number} id - Expense ID.
   */
  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    setPending(true);
    try {
      await deleteExpense(id);
      window.location.reload();
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
      setPending(false);
    }
  }

  /**
   * Opens the inline edit form for an expense.
   * @param {Object} exp - Expense row.
   */
  function startEdit(exp) {
    const toDateStr = (d) =>
      typeof d === "string" ? d : d.toISOString().slice(0, 10);
    setEditId(exp.id);
    setEditForm({
      paid_by: exp.paid_by,
      amount: parseFloat(exp.amount).toFixed(2),
      description: exp.description,
      expense_date: toDateStr(exp.expense_date),
      currency: exp.currency || "USD",
      rate_to_base: parseFloat(exp.rate_to_base),
      rate_date: toDateStr(exp.rate_date),
      adam_shares: exp.adam_shares.toString(),
      matt_shares: exp.matt_shares.toString(),
      adam_adjustment: parseFloat(exp.adam_adjustment).toString(),
      matt_adjustment: parseFloat(exp.matt_adjustment).toString(),
    });
  }

  const visibleExpenses = [...initialExpenses]
    .filter((e) => filterUser === "all" || e.paid_by === filterUser)
    .sort((a, b) => {
      let av, bv;
      if (sort.field === "date_added") {
        av = a.id;
        bv = b.id;
      } else if (sort.field === "expense_date") {
        av = a.expense_date;
        bv = b.expense_date;
      } else {
        av = parseFloat(a.amount) * (parseFloat(a.rate_to_base) || 1);
        bv = parseFloat(b.amount) * (parseFloat(b.rate_to_base) || 1);
      }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <h1 className={styles.title}>🇮🇪 Ireland Trip</h1>

        {/* Settlement Summary */}
        <div className={styles.settlement}>
          <div className={styles.settlementLine}>{settlementLine}</div>
          <div className={styles.settlementBreakdown}>
            <div
              className={`${styles.settlementRow} ${styles.settlementHeader}`}
            >
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
                {settlement.adamNet >= 0 ? "+" : ""}$
                {settlement.adamNet.toFixed(2)}
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
                {settlement.mattNet >= 0 ? "+" : ""}$
                {settlement.mattNet.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Add Expense Form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Expense</h2>
          <form onSubmit={handleAdd} className={styles.expenseForm}>
            <ExpenseFields
              form={form}
              setForm={setForm}
              styles={styles}
            />
            <button
              className={styles.submitBtn}
              type="submit"
              disabled={pending}
            >
              {pending ? "Fetching rate…" : "Add Expense"}
            </button>
          </form>
        </div>

        {/* Expense List */}
        <div className={styles.section}>
          <div className={styles.expenseListHeader}>
            <h2 className={styles.sectionTitle}>
              Expenses ({visibleExpenses.length})
            </h2>
            <div className={styles.personSelector}>
              {[["all", "All"], ["adam", "Adam"], ["matt", "Matt"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.personBtn} ${filterUser === value ? styles.personBtnActive : ""}`}
                  onClick={() => setFilterUser(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.sortBar}>
            {[
              ["date_added", "Date Added"],
              ["expense_date", "Expense Date"],
              ["amount", "Amount"],
            ].map(([field, label]) => {
              const active = sort.field === field;
              return (
                <button
                  key={field}
                  type="button"
                  className={`${styles.personBtn} ${active ? styles.personBtnActive : ""}`}
                  onClick={() =>
                    setSort(active
                      ? { field, dir: sort.dir === "desc" ? "asc" : "desc" }
                      : { field, dir: "desc" }
                    )
                  }
                >
                  {label} {active ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                </button>
              );
            })}
          </div>
          {visibleExpenses.length === 0 && (
            <p className={styles.empty}>No expenses yet.</p>
          )}
          {visibleExpenses.map((exp) => {
            const { adamPortion, mattPortion } = computePortions(exp);
            const rate = parseFloat(exp.rate_to_base) || 1;
            const currency = exp.currency || "USD";
            const isUSD = currency === "USD";
            const isEditing = editId === exp.id;
            return (
              <div key={exp.id} className={styles.expenseCard}>
                {isEditing ? (
                  <form onSubmit={handleUpdate} className={styles.expenseForm}>
                    <ExpenseFields
                      form={editForm}
                      setForm={setEditForm}
                      styles={styles}
                    />
                    <div className={styles.editActions}>
                      <button
                        className={styles.submitBtn}
                        type="submit"
                        disabled={pending}
                      >
                        {pending ? "Fetching rate…" : "Save"}
                      </button>
                      <button
                        className={styles.cancelBtn}
                        type="button"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.expenseMain}>
                      <div className={styles.expenseInfo}>
                        <span className={styles.expenseDesc}>
                          {exp.description}
                        </span>
                        <span className={styles.expenseMeta}>
                          {formatDate(exp.expense_date)} ·{" "}
                          {exp.paid_by === "adam" ? "Adam" : "Matt"} paid{" "}
                          {isUSD
                            ? formatCurrency(parseFloat(exp.amount), "USD")
                            : `${formatCurrency(
                                parseFloat(exp.amount),
                                currency
                              )} (${formatCurrency(
                                parseFloat(exp.amount) * rate,
                                "USD"
                              )})`}
                        </span>
                        {!isUSD && (
                          <span className={styles.rateNote}>
                            1 {currency} = ${rate.toFixed(4)} on{" "}
                            {formatDate(
                              typeof exp.rate_date === "string"
                                ? exp.rate_date
                                : exp.rate_date.toISOString().slice(0, 10)
                            )}
                          </span>
                        )}
                      </div>
                      <div className={styles.expenseActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEdit(exp)}
                          disabled={pending}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(exp.id)}
                          disabled={pending}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className={styles.expensePortions}>
                      <span>
                        Adam: {formatCurrency(adamPortion * rate, "USD")}
                      </span>
                      <span>
                        Matt: {formatCurrency(mattPortion * rate, "USD")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

TripTracker.propTypes = {
  initialExpenses: PropTypes.arrayOf(PropTypes.object).isRequired,
};

/**
 * Shared form fields used for both add and edit expense forms.
 * @param {{form: Object, setForm: Function, person: string, styles: Object}} props
 * @return {React.ReactElement}
 */
function ExpenseFields({ form, setForm, styles }) {
  const currency = form.currency || "USD";
  return (
    <>
      <div className={styles.formRow}>
        <label className={styles.label}>Amount ({currency})</label>
        <input
          className={styles.totalInput}
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
        <div className={styles.personSelector}>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.personBtn} ${currency === c ? styles.personBtnActive : ""}`}
              onClick={() => setForm({ ...form, currency: c })}
            >
              {CURRENCY_FLAGS[c]} {c}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Description</label>
        <input
          className={styles.totalInput}
          type="text"
          placeholder="e.g. Dinner"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Paid by</label>
        <div className={styles.personSelector}>
          {["adam", "matt"].map((p) => (
            <button
              key={p}
              type="button"
              className={`${styles.personBtn} ${form.paid_by === p ? styles.personBtnActive : ""}`}
              onClick={() => {
                setForm({ ...form, paid_by: p });
                localStorage.setItem("trip-person", p);
              }}
            >
              {p === "adam" ? "Adam" : "Matt"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.formRow}>
        <label className={styles.label}>Date</label>
        <input
          className={styles.dateInput}
          type="date"
          value={form.expense_date}
          onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
          required
        />
      </div>
      <div className={styles.sharesGrid}>
        {/* header */}
        <div />
        <div className={styles.sharesColHeader}>Adam</div>
        <div className={styles.sharesColHeader}>Matt</div>
        {/* shares row */}
        <div className={styles.sharesRowLabel}>Shares</div>
        <input
          className={styles.sharesInput}
          type="number"
          min="0"
          step="1"
          value={form.adam_shares}
          onChange={(e) => setForm({ ...form, adam_shares: e.target.value })}
        />
        <input
          className={styles.sharesInput}
          type="number"
          min="0"
          step="1"
          value={form.matt_shares}
          onChange={(e) => setForm({ ...form, matt_shares: e.target.value })}
        />
        {/* adjustment row */}
        <div className={styles.sharesRowLabel}>+/-</div>
        <input
          className={styles.adjustmentInput}
          type="number"
          step="0.01"
          placeholder="0"
          value={form.adam_adjustment}
          onChange={(e) => setForm({ ...form, adam_adjustment: e.target.value })}
        />
        <input
          className={styles.adjustmentInput}
          type="number"
          step="0.01"
          placeholder="0"
          value={form.matt_adjustment}
          onChange={(e) => setForm({ ...form, matt_adjustment: e.target.value })}
        />
        {/* cost preview row */}
        {(() => {
          const amt = parseFloat(form.amount) || 0;
          const aShares = parseInt(form.adam_shares) || 0;
          const mShares = parseInt(form.matt_shares) || 0;
          const aAdj = parseFloat(form.adam_adjustment) || 0;
          const mAdj = parseFloat(form.matt_adjustment) || 0;
          const total = aShares + mShares;
          const remaining = amt - aAdj - mAdj;
          const aCost = total > 0 ? (aShares / total) * remaining + aAdj : aAdj;
          const mCost = total > 0 ? (mShares / total) * remaining + mAdj : mAdj;
          return (
            <>
              <div className={styles.sharesRowLabel}>Cost</div>
              <div className={styles.sharesCostValue}>
                {formatCurrency(aCost, currency)}
              </div>
              <div className={styles.sharesCostValue}>
                {formatCurrency(mCost, currency)}
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}

ExpenseFields.propTypes = {
  form: PropTypes.object.isRequired,
  setForm: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};
