import React from "react";
import PropTypes from "prop-types";
import styles from "./Card.module.css";

/**
 * Shared card surface. Provides background, border, and border-radius.
 * Callers add padding, margin, and any internal layout via className.
 *
 * accent: true applies the soft-blue highlight variant (e.g. settlement summary)
 * @param {Object} props
 * @return {React.ReactElement}
 */
export default function Card({ accent, className, children, ...props }) {
  const cls = [styles.card, accent ? styles.accent : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}

Card.propTypes = {
  accent: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
