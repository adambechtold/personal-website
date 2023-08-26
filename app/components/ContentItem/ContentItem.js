import React from "react";
import styles from "./ContentItem.module.css";
import { Merriweather } from "next/font/google";

const merriweatherFont = Merriweather({
  subsets: ["latin"],
  weight: "300",
});

import PropTypes from "prop-types";

/**
 * Renders one item of content for the personal website. Each
 * has a title and some content provided by the parent.
 *
 * @param {Object} props - The component props.
 *  @param {string} props.title - The title of the content item.
 *  @param {React.ReactNode} props.children - The children to render inside the content item.
 * @return {JSX.Element} - The rendered content item.
 */
export default function ContentItem({ title, children }) {
  return (
    <div className={styles.container}>
      <h2 className={merriweatherFont.className}>{title}</h2>
      {children}
    </div>
  );
}

ContentItem.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
