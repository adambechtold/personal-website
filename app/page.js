import React from "react";
import styles from "./page.module.css";

import Profile from "./components/Profile/Profile";
import ContentItem from "./components/ContentItem/ContentItem";

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
            <p>
              {
                "I'm doing things that I'd like to tell you about! Eventually, this will be full of text convincing you that I'm a serious about bio. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eleifend justo non metus gravida, a commodo lacus facilisis. Fusce non arcu at leo luctus molestie. Proin tincidunt vulputate odio, vitae luctus nulla consectetur id."
              }
            </p>
          </ContentItem>
          <ContentItem title="👨🏻‍💻 experience">
            <p>
              <b>Product Manager</b> @ <b>Cosmos </b>
              <small>{"(july 2019 - may 2023)"}</small>
            </p>
            <p>
              <b>Product Management Co-op</b> @ <b>Mavrck </b>
              <small>{"(july 2018 - decmeber 2018)"}</small>
            </p>
            <p>
              <b>Bioinformatics Co-op</b> @ <b>Editas </b>
              <small>{"(july 2017 - june 2018)"}</small>
            </p>
            <p>
              <b>Product Manager</b> @ <b>Cosmos </b>
              <small>{"(january 2016 - september 2016)"}</small>
            </p>
          </ContentItem>
          <ContentItem title="🎓 education">
            <p>
              <b>Northeastern University</b> <br />
              BS Computer Science, May 2019 <br />
              BS Computer Engineering, May 2019
            </p>
            <p>
              <i>Director of Technology @ Scout</i> <br />
              <i>President @ TAMID</i> <br />
              <i>
                Research Assistant @ Massachusetts General Hospital, Barret Lab
              </i>
            </p>
          </ContentItem>
          <ContentItem title="💬 let's chat" />
        </div>
      </div>
    </main>
  );
}
