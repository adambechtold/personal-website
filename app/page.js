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
      <Profile />
    </main>
  );
}
