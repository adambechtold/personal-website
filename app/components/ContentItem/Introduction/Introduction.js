/* eslint-disable require-jsdoc */
import React from "react";

import styles from "./Introduction.module.css";

export default function Introduction() {
  return (
    <div className={styles.container}>
      <p>I&apos;m Adam: Software Engineer, reformed Product Manager.</p>
      <p>
        I make{" "}
        <a
          href="https://www.vibeiq.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          VibeIQ&apos;s
        </a>{" "}
        platform faster, more reliable, and impenetrably secure.
      </p>
    </div>
  );
}
