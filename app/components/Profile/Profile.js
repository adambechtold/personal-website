import React from "react";
import Image from "next/image";
import PersonalLinks from "../PersonalLinks/PersonalLinks";

import styles from "./Profile.module.css";

/**
 * Quick information and links about Adam Bechtold.
 * @return {JSX.Element} The profile component.
 */
export default function Profile() {
  return (
    <div className={styles.container}>
      <Image
        src="/profile-picture.jpeg"
        alt="Profile Picture"
        className={styles["profile-picture"]}
        width={240}
        height={240}
        priority
      />
      <h1 className={styles.title}>Adam Bechtold</h1>
      <PersonalLinks />
    </div>
  );
}
