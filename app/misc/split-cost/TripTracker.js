"use client";

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import styles from "./split-cost.module.css";
import Button from "../../components/ui/Button";
import { addExpense, updateExpense, deleteExpense } from "./actions";
import { computeSettlement, computeTransfers } from "./calc";
import { personName } from "./trips";
import { TODAY, toDateString } from "./lib/format";
import SettlementSummary from "./components/SettlementSummary";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";

/**
 * Builds the blank add-expense form for a trip: an even split between
 * everyone, paid by the first person, in the trip's first currency.
 * @param {Object} trip - The trip.
 * @return {Object} The empty form state.
 */
function emptyFormFor(trip) {
  const splits = {};
  for (const person of trip.people) {
    splits[person.id] = { shares: "1", adjustment: "0" };
  }
  return {
    description: "",
    amount: "",
    expense_date: TODAY,
    paid_by: trip.people[0].id,
    currency: trip.currencies[0],
    splits,
  };
}

/**
 * Builds the settlement headline lines for the summary card.
 * @param {Object} trip - The trip.
 * @param {Array<{from: string, to: string, amount: number}>} transfers -
 *   Payments that settle the trip, from computeTransfers.
 * @return {Array<string>} One "who owes whom" line per payment.
 */
function settlementLinesFor(trip, transfers) {
  if (transfers.length === 0) return ["All settled up 🎉"];
  return transfers.map(
    (transfer) =>
      `${personName(trip, transfer.from)} owes ${personName(
        trip,
        transfer.to
      )} $${transfer.amount.toFixed(2)}`
  );
}

/**
 * Trip tracker client component. Owns form + edit state and the expense
 * mutations; delegates rendering to the settlement summary, add form, and
 * expense list.
 * @param {{trip: Object, initialExpenses: Array}} props
 * @return {React.ReactElement}
 */
export default function TripTracker({ trip, initialExpenses }) {
  const [form, setForm] = useState(() => emptyFormFor(trip));
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [pending, setPending] = useState(false);

  const personIds = trip.people.map((person) => person.id);
  const rememberedPayerKey = `trip-person-${trip.slug}`;

  useEffect(() => {
    const saved = localStorage.getItem(rememberedPayerKey);
    if (trip.people.some((person) => person.id === saved))
      setForm((previous) => ({ ...previous, paid_by: saved }));
  }, [trip, rememberedPayerKey]);

  const settlement = computeSettlement(initialExpenses, personIds);
  const settlementLines = settlementLinesFor(
    trip,
    computeTransfers(settlement)
  );

  /**
   * Handles add-expense form submission.
   * @param {React.FormEvent} event
   */
  async function handleAdd(event) {
    event.preventDefault();
    setPending(true);
    try {
      await addExpense(trip.slug, form);
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
      await updateExpense(trip.slug, editId, editForm);
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
      await deleteExpense(trip.slug, id);
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
    const splits = {};
    for (const person of trip.people) {
      const split = (expense.splits || {})[person.id] || {};
      splits[person.id] = {
        shares: (parseInt(split.shares) || 0).toString(),
        adjustment: (parseFloat(split.adjustment) || 0).toString(),
      };
    }
    setEditId(expense.id);
    setEditForm({
      paid_by: expense.paid_by,
      amount: parseFloat(expense.amount).toFixed(2),
      description: expense.description,
      expense_date: toDateString(expense.expense_date),
      currency: expense.currency || "USD",
      rate_to_base: parseFloat(expense.rate_to_base),
      rate_date: toDateString(expense.rate_date),
      splits,
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/misc/split-cost" className={styles.backLink}>
          ← All trips
        </Link>
        <h1 className={styles.title}>
          {trip.emoji} {trip.name}
        </h1>

        {/* Settlement Summary */}
        <div className={styles.section}>
          <SettlementSummary
            trip={trip}
            settlement={settlement}
            settlementLines={settlementLines}
          />
        </div>

        {/* Add Expense Form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add Expense</h2>
          <form onSubmit={handleAdd} className={styles.expenseForm}>
            <ExpenseForm
              trip={trip}
              form={form}
              setForm={setForm}
              onPayerPicked={(personId) =>
                localStorage.setItem(rememberedPayerKey, personId)
              }
            />
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
          trip={trip}
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
  trip: PropTypes.object.isRequired,
  initialExpenses: PropTypes.arrayOf(PropTypes.object).isRequired,
};
