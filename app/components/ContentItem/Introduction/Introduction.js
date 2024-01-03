/* eslint-disable require-jsdoc */
import React from "react";

import styles from "./Introduction.module.css";

export default function Introduction() {
  return (
    <div className={styles.container}>
      <p>
        {
          "I'm Adam, a Product Manager falling back in love with technical work."
        }
      </p>
      <p>
        I recently wrapped up my work at{" "}
        <a href="https://cosmos.space">Cosmos Partners</a> and am noodling on
        what comes next... 🤔
      </p>
      <p>
        In the meantime, check out my latest projects on{" "}
        <a href="https://github.com/adambechtold">GitHub</a> and return to this
        site soon for more updates!
      </p>
    </div>
  );
}
