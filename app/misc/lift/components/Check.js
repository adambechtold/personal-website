import React from "react";
import PropTypes from "prop-types";

/**
 * The checkmark glyph used by done toggles and the run logger. Centralizes the
 * SVG that was previously inlined in several places.
 * @param {{size: number, stroke: string}} props
 * @return {React.ReactElement}
 */
export default function Check({ size = 16, stroke = "#fff" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12l5 5L20 6" />
    </svg>
  );
}

Check.propTypes = {
  size: PropTypes.number,
  stroke: PropTypes.string,
};
