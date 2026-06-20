"use client";

import React from "react";
import PropTypes from "prop-types";
import styles from "./Button.module.css";

/**
 * Shared button primitive. Handles visual identity; callers add layout/size.
 *
 * variant: "primary" | "outlined" | "accent" | "pill"
 * active:  true adds the .active modifier (filled blue — used with "pill")
 * size:    "sm" for small action buttons (edit/delete)
 * @param {Object} props
 * @return {React.ReactElement}
 */
export default function Button({
  variant = "outlined",
  size,
  active,
  className,
  children,
  ...props
}) {
  const cls = [
    styles.btn,
    styles[variant] ?? "",
    size ? styles[size] : "",
    active ? styles.active : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "outlined", "accent", "pill"]),
  size: PropTypes.oneOf(["sm"]),
  active: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
