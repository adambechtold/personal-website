"use client";
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import styles from "./workoutCelebration.module.css";

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
 * @param {string} sessionId - The session ID (e.g. "upperA", "lowerB").
 * @return {Array<Object>} Array of particle descriptors.
 */
function buildParticles(sessionId) {
  const emojis = SESSION_EMOJIS[sessionId] ?? ["🎉", "✨", "🔥"];
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    id: index,
    emoji: emojis[index % emojis.length],
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
 * @param {{sessionId: string, onDone: Function}} props
 * @return {React.ReactElement} The rendered overlay.
 */
export default function WorkoutCelebration({ sessionId, onDone }) {
  const particles = useRef(buildParticles(sessionId)).current;

  useEffect(() => {
    const timeoutId = setTimeout(onDone, AUTO_DISMISS_MS);
    return () => clearTimeout(timeoutId);
  }, [onDone]);

  return (
    <div
      className={styles.celebrationOverlay}
      onClick={onDone}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={
            particle.clockwise
              ? styles.celebrationEmojiCw
              : styles.celebrationEmojiCcw
          }
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            fontSize: `${particle.size}rem`,
          }}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}

WorkoutCelebration.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
};
