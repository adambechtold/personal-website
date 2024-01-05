import React from "react";

import indexStyles from "@/app/page.module.css";
import profileStyles from "@/app/components/Profile/Profile.module.css";
import styles from "./page.module.css";

/**
 * Renders a page that explains that the taste explorer is coming soon.
 * @return {JSX.Element} The taste explorer page component.
 */
export default function TasteExplorerInfo() {
  return (
    <main className={indexStyles.main}>
      <div className={styles.container}>
        <h1>The Music Taste Explorer...</h1>
        <h2>...is coming soon!</h2>
        <img
          className={[
            profileStyles["profile-picture"],
            styles["placeholder-image"],
          ].join(" ")}
          src="https://media.giphy.com/media/tAeB6dptxnoli/giphy.gif"
          alt="Animated GIF of construction workers on a job site dancing."
        />
        <h4>
          Check out the{" "}
          <a href="https://github.com/adambechtold/taste-explorer">code</a> in
          the meantime, and <a href="mailto:adam@adambechtold.xyz">reach out</a>{" "}
          with any suggestions.
        </h4>
      </div>
    </main>
  );
}
