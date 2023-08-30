import React from "react";
import PropTypes from "prop-types";
import { Montserrat } from "next/font/google";
import "./globals.css";

import GoogleAnalytics from "./components/GoogleAnalytics/GoogleAnalytics";

const montserratFont = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Adam Bechtold",
  description: "Learn about Adam Bechtold.",
};

/**
 * Root layout component for the entire app.
 * @param {Object} props - The props object.
 * @param {React.ReactNode} props.children - The children to render.
 * @return {JSX.Element} The root layout component.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <GoogleAnalytics GA_TRACKING_ID={process.env.GA_TRACKING_ID} />
      <body className={montserratFont.className}>{children}</body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
