"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "./split-cost.module.css";
import Button from "../../components/ui/Button";
import { addExpense, updateExpense, deleteExpense } from "./actions";
import { computeSettlement } from "./calc";
import { TODAY, toDateString } from "./lib/format";
import SettlementSummary from "./components/SettlementSummary";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";

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
 * Builds the settlement headline for the summary card.
 * @param {number} adamNet - Adam's net balance.
 * @return {string} The "who owes whom" line.
 */
function settlementLineFor(adamNet) {
  if (Math.abs(adamNet) < 0.01) return "All settled up 🎉";
  if (adamNet > 0) return `Matt owes Adam $${adamNet.toFixed(2)}`;
  return `Adam owes Matt $${(-adamNet).toFixed(2)}`;
}

/**
 * Trip tracker client component for the Ireland trip. Owns form + edit state
 * and the expense mutations; delegates rendering to the settlement summary,
 * add form, and expense list.
 * @param {{initialExpenses: Array}} props
 * @return {React.ReactElement}
 */
export default function TripTracker({ initialExpenses }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("trip-person");
    if (saved === "adam" || saved === "matt")
      setForm((previous) => ({ ...previous, paid_by: saved }));
  }, []);

  const settlement = computeSettlement(initialExpenses);
  const settlementLine = settlementLineFor(settlement.adamNet);

  /**
   * Handles add-expense form submission.
   * @param {React.FormEvent} event
   */
  async function handleAdd(event) {
    event.preventDefault();
    setPending(true);
    try {
      await addExpense(form);
      window.location.reload();
    } catch (error) {
      alert("Failed to add expense: " + error.message);
      setPending(false);
    }
  }

  /**
   * Handles edit-expense form submission.
   * @param {React.FormEvent} event
   */
  async function handleUpdate(event) {
    event.preventDefault();
    setPending(true);
    try {
      await updateExpense(editId, editForm);
      window.location.reload();
    } catch (error) {
      alert("Failed to update expense: " + error.message);
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
    } catch (error) {
      alert("Failed to delete expense: " + error.message);
      setPending(false);
    }
  }

  /**
   * Opens the inline edit form for an expense.
   * @param {Object} expense - Expense row.
   */
  function startEdit(expense) {
    setEditId(expense.id);
    setEditForm({
      paid_by: expense.paid_by,
      amount: parseFloat(expense.amount).toFixed(2),
      description: expense.description,
      expense_date: toDateString(expense.expense_date),
      currency: expense.currency || "USD",
      rate_to_base: parseFloat(expense.rate_to_base),
      rate_date: toDateString(expense.rate_date),
      adam_shares: expense.adam_shares.toString(),
      matt_shares: expense.matt_shares.toString(),
      adam_adjustment: parseFloat(expense.adam_adjustment).toString(),
      matt_adjustment: parseFloat(expense.matt_adjustment).toString(),
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>🇮🇪 Ireland Trip</h1>

        {/* Settlement Summary */}
        <div className={styles.section}>
          <SettlementSummary
            settlement={settlement}
            settlementLine={settlementLine}
          />
        </div>

        {/* Add Expense Form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Expense</h2>
          <form onSubmit={handleAdd} className={styles.expenseForm}>
            <ExpenseForm form={form} setForm={setForm} />
            <Button
              variant="primary"
              type="submit"
              disabled={pending}
              className={styles.submitBtn}
            >
              {pending ? "Saving…" : "Add Expense"}
            </Button>
          </form>
        </div>

        {/* Expense List */}
        <ExpenseList
          expenses={initialExpenses}
          editId={editId}
          editForm={editForm}
          setEditForm={setEditForm}
          pending={pending}
          onStartEdit={startEdit}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onCancelEdit={() => setEditId(null)}
        />
      </div>
    </div>
  );
}

TripTracker.propTypes = {
  initialExpenses: PropTypes.arrayOf(PropTypes.object).isRequired,
};
