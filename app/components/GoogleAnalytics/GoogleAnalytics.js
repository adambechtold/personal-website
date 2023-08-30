"use client";
import React from "react";
import Script from "next/script";

import PropTypes from "prop-types";

const GoogleAnalytics = ({ GA_TRACKING_ID }) => {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
        window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
};

GoogleAnalytics.propTypes = {
  GA_TRACKING_ID: PropTypes.string.isRequired,
};

export default GoogleAnalytics;
