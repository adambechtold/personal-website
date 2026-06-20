"use client";
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import styles from "./lift.module.css";

const SESSION_EMOJIS = {
  upperA: ["💪", "🏋️", "🔥", "⚡", "🦾"],
  upperB: ["💪", "🏋️", "🔥", "⚡", "🦾"],
  lowerA: ["🦵", "🏋️", "🔥", "⚡", "💥"],
  lowerB: ["🦵", "🏋️", "🔥", "⚡", "💥"],
  run: ["🏃", "💨", "👟", "🔥", "⚡"],
};

const PARTICLE_COUNT = 50;
const AUTO_DISMISS_MS = 3600;

/**
 * Builds a randomized list of emoji particles for the given session type.
 * @param {string} sid - The session ID (e.g. "upperA", "lowerB").
 * @return {Array<Object>} Array of particle descriptors.
 */
function buildParticles(sid) {
  const emojis = SESSION_EMOJIS[sid] ?? ["🎉", "✨", "🔥"];
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    emoji: emojis[i % emojis.length],
    left: Math.random() * 96,
    delay: Math.random() * 1.5,
    duration: 1.6 + Math.random() * 1.8,
    size: 1.0 + Math.random() * 1.3,
    clockwise: Math.random() > 0.5,
  }));
}

/**
 * Renders an emoji confetti overlay that auto-dismisses after a short delay.
 * Emojis are chosen based on the session type (upper/lower body).
 * @param {{sid: string, onDone: Function}} props
 * @return {React.ReactElement} The rendered overlay.
 */
export default function WorkoutCelebration({ sid, onDone }) {
  const particles = useRef(buildParticles(sid)).current;

  useEffect(() => {
    const t = setTimeout(onDone, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={styles.celebrationOverlay}
      onClick={onDone}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={
            p.clockwise
              ? styles.celebrationEmojiCw
              : styles.celebrationEmojiCcw
          }
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

WorkoutCelebration.propTypes = {
  sid: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};
