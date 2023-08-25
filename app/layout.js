import React from "react";
import PropTypes from "prop-types";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserratFont = Montserrat({
  subsets: ["latin"],
  weight: "300",
});

export const metadata = {
  title: "Adam Bechtold",
  description: "Learn about the man, the myth, the legend...",
};

/**
 * This applies to every page.
 * @param {children} param0
 * @return {JSX.Element}
 */

/**
 * Root layout component for the entire app.
 * @param {Object} props - The props object.
 * @param {React.ReactNode} props.children - The children to render.
 * @return {JSX.Element} The root layout component.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={montserratFont.className}>{children}</body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
