import React from "react";
import styles from "./page.module.css";

import Profile from "./components/Profile/Profile";
import ContentItem from "./components/ContentItem/ContentItem";

import Introduction from "./components/ContentItem/Introduction/Introduction";
import Experience from "./components/ContentItem/Experience/Experience";
import Education from "./components/ContentItem/Education/Education";

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
        <div className={styles.content}>
          <ContentItem title="👋🏼 hi">
            <Introduction />
          </ContentItem>
          <ContentItem title="👨🏻‍💻 experience">
            <Experience />
          </ContentItem>
          <ContentItem title="🎓 education">
            <Education />
          </ContentItem>
        </div>
      </div>
    </main>
  );
}
