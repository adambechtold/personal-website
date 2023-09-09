import React from "react";
import styles from "./SuccessfulSendEmoji.module.css";

/**
 * Renders a success message with an emoji.
 * @return {JSX.Element} The rendered success message.
 */
export default function SuccessfulSendEmoji() {
  return (
    <div className={[styles.emoji, styles.grow, styles["shoot-up"]].join(" ")}>
      💌
    </div>
  );
}
