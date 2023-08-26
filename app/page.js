import React from "react";
import styles from "./page.module.css";
import Profile from "./components/Profile/Profile";

/**
 * Renders the home page.
 * @return {JSX.Element} The home page component.
 */
export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.profileContainer}>
          <Profile />
        </div>
        <div className={styles.content} />
      </div>
    </main>
  );
}
