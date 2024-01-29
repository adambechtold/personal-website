import React from "react";
import styles from "./page.module.css";

import Profile from "./components/Profile/Profile";
import ContentItem from "./components/ContentItem/ContentItem";

import Education from "./components/ContentItem/Education/Education";
import Experience from "./components/ContentItem/Experience/Experience";
import Introduction from "./components/ContentItem/Introduction/Introduction";
import Projects from "./components/ContentItem/Projects/Projects";

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
          <ContentItem title="👋🏼 Hello!">
            <Introduction />
          </ContentItem>
          <ContentItem title="🛠️ Recent Projects">
            <Projects />
          </ContentItem>
          <ContentItem title="👨🏻‍💻 Experience">
            <Experience />
          </ContentItem>
          <ContentItem title="🎓 Education">
            <Education />
          </ContentItem>
        </div>
      </div>
    </main>
  );
}
