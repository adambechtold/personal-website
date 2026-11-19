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

          // Share links carry a secret key in the path; never send it to GA.
          if (window.location.pathname.indexOf('/shared/') === 0) {
            gtag('config', '${GA_TRACKING_ID}', {
              page_location: window.location.origin + '/shared/redacted',
              page_path: '/shared/redacted',
              page_referrer: '',
            });
          } else {
            gtag('config', '${GA_TRACKING_ID}');
          }
        `}
      </Script>
    </>
  );
};

GoogleAnalytics.propTypes = {
  GA_TRACKING_ID: PropTypes.string.isRequired,
};

export default GoogleAnalytics;
