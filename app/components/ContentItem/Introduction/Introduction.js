/* eslint-disable require-jsdoc */
import React from "react";

import styles from "./Introduction.module.css";

export default function Introduction() {
  return (
    <div className={styles.container}>
      <p>
        I&apos;m Adam. I&apos;ve returned to software engineering after a few
        years in product management.
      </p>
      <p>
        I&apos;ve rediscovered just how much I love solving technical problems
        hands-on. I&apos;m looking for a role in which I can contribute quickly,
        that takes advantage of my Product experience, and offers plenty of room
        to grow.
      </p>
      <p>
        If you&apos;re planning to interview me soon, take a look at this{" "}
        <a href="https://docs.google.com/spreadsheets/d/1T5XWTvfeR3UWIPYFYr4-63ggB-xIo-I0PKQ41Vri90o/edit?usp=sharing">
          list
        </a>{" "}
        of technical questions I&apos;ve practiced recently. It&apos;s important
        to me that you ask me something fresh and challenging, so you have a
        clear view into how I work.{" "}
      </p>
    </div>
  );
}
