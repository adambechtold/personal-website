"use client";

import React, { useState } from "react";
import styles from "./split-cost.module.css";

let nextId = 3;

/**
 * Cost splitter component that splits costs among people based on shares.
 * @return {React.ReactElement} The rendered component.
 */
export default function CostSplitter() {
  const [totalCost, setTotalCost] = useState("");
  const [people, setPeople] = useState([
    { id: 1, name: "Person 1", shares: 1 },
    { id: 2, name: "Person 2", shares: 1 },
  ]);

  const totalShares = people.reduce((sum, p) => sum + p.shares, 0);
  const cost = parseFloat(totalCost) || 0;

  /**
   * Adds a new person to the list.
   */
  function addPerson() {
    setPeople([...people, { id: nextId, name: `Person ${nextId}`, shares: 1 }]);
    nextId++;
  }

  /**
   * Removes a person from the list by ID.
   * @param {number} id - The ID of the person to remove.
   */
  function removePerson(id) {
    if (people.length <= 1) return;
    setPeople(people.filter((p) => p.id !== id));
  }

  /**
   * Updates a person's field with a new value.
   * @param {number} id - The ID of the person to update.
   * @param {string} field - The field to update.
   * @param {*} value - The new value for the field.
   */
  function updatePerson(id, field, value) {
    setPeople(people.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Split Cost</h1>

        <div className={styles.totalSection}>
          <label className={styles.label}>Total Cost ($)</label>
          <input
            className={styles.totalInput}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
          />
        </div>

        <div className={styles.peopleHeader}>
          <span className={styles.peopleTitle}>People</span>
          <button className={styles.addButton} onClick={addPerson}>
            + Add
          </button>
        </div>

        {people.map((person) => (
          <div key={person.id} className={styles.personRow}>
            <input
              className={styles.nameInput}
              type="text"
              value={person.name}
              onChange={(e) => updatePerson(person.id, "name", e.target.value)}
            />
            <input
              className={styles.sharesInput}
              type="number"
              min="0"
              step="1"
              value={person.shares}
              onChange={(e) =>
                updatePerson(
                  person.id,
                  "shares",
                  Math.max(0, parseInt(e.target.value) || 0)
                )
              }
            />
            <button
              className={styles.removeButton}
              onClick={() => removePerson(person.id)}
              title="Remove"
            >
              &times;
            </button>
          </div>
        ))}

        {cost > 0 && totalShares > 0 && (
          <div className={styles.results}>
            <h2 className={styles.resultsTitle}>Each Person Owes</h2>
            {people.map((person) => {
              const amount = (person.shares / totalShares) * cost;
              return (
                <div key={person.id} className={styles.resultRow}>
                  <span className={styles.resultName}>{person.name}</span>
                  <span className={styles.resultAmount}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
