import React, { useState } from "react";
import PropTypes from "prop-types";
import styles from "../split-cost.module.css";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import ExpenseForm from "./ExpenseForm";
import { computePortions } from "../calc";
import { formatCurrency, formatDate, toDateStr } from "../lib/format";

/**
 * Sorts and filters the expenses for display.
 * @param {Array} expenses - All expenses.
 * @param {string} filterUser - "all" | "adam" | "matt".
 * @param {{field: string, dir: string}} sort - Sort field and direction.
 * @return {Array} The visible, ordered expenses.
 */
function selectVisible(expenses, filterUser, sort) {
  return [...expenses]
    .filter((e) => filterUser === "all" || e.paid_by === filterUser)
    .sort((a, b) => {
      let av;
      let bv;
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
}

/**
 * The expenses section: payer filter, sort controls, and the list of expense
 * cards (each either a read-only summary or an inline edit form).
 * @param {Object} props
 * @param {Array} props.expenses - All expenses.
 * @param {number|null} props.editId - Id of the expense being edited.
 * @param {Object|null} props.editForm - The edit form state.
 * @param {Function} props.setEditForm - Edit form setter.
 * @param {boolean} props.pending - Whether a mutation is in flight.
 * @param {Function} props.onStartEdit - (exp) => void.
 * @param {Function} props.onDelete - (id) => void.
 * @param {Function} props.onUpdate - (e) => void form submit.
 * @param {Function} props.onCancelEdit - () => void.
 * @return {React.ReactElement}
 */
export default function ExpenseList({
  expenses,
  editId,
  editForm,
  setEditForm,
  pending,
  onStartEdit,
  onDelete,
  onUpdate,
  onCancelEdit,
}) {
  const [filterUser, setFilterUser] = useState("all");
  const [sort, setSort] = useState({ field: "date_added", dir: "desc" });

  const visibleExpenses = selectVisible(expenses, filterUser, sort);

  return (
    <div className={styles.section}>
      <div className={styles.expenseHeader}>
        <h2 className={styles.sectionTitle}>
          Expenses ({visibleExpenses.length})
        </h2>
        <div className={styles.pillRow}>
          {[
            ["all", "All"],
            ["adam", "Adam"],
            ["matt", "Matt"],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="pill"
              active={filterUser === value}
              onClick={() => setFilterUser(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.listControls}>
        <div className={styles.pillRow}>
          {[
            ["date_added", "Date Added"],
            ["expense_date", "Expense Date"],
          ].map(([field, label]) => {
            const active = sort.field === field;
            return (
              <Button
                key={field}
                type="button"
                variant="pill"
                active={active}
                onClick={() =>
                  setSort(
                    active
                      ? { field, dir: sort.dir === "desc" ? "asc" : "desc" }
                      : { field, dir: "desc" }
                  )
                }
              >
                {label} {active ? (sort.dir === "desc" ? "↓" : "↑") : ""}
              </Button>
            );
          })}
        </div>
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
          <Card key={exp.id} className={styles.expenseCard}>
            {isEditing ? (
              <form onSubmit={onUpdate} className={styles.expenseForm}>
                <ExpenseForm form={editForm} setForm={setEditForm} />
                <div className={styles.editActions}>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={pending}
                    className={styles.submitBtn}
                  >
                    {pending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    variant="outlined"
                    type="button"
                    onClick={onCancelEdit}
                  >
                    Cancel
                  </Button>
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
                        {formatDate(toDateStr(exp.rate_date))}
                      </span>
                    )}
                  </div>
                  <div className={styles.expenseActions}>
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => onStartEdit(exp)}
                      disabled={pending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      size="sm"
                      className={styles.deleteBtn}
                      onClick={() => onDelete(exp.id)}
                      disabled={pending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className={styles.expensePortions}>
                  <span>Adam: {formatCurrency(adamPortion * rate, "USD")}</span>
                  <span>Matt: {formatCurrency(mattPortion * rate, "USD")}</span>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

ExpenseList.propTypes = {
  expenses: PropTypes.arrayOf(PropTypes.object).isRequired,
  editId: PropTypes.number,
  editForm: PropTypes.object,
  setEditForm: PropTypes.func.isRequired,
  pending: PropTypes.bool.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
};
