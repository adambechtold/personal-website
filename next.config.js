/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
    // Use the system trust store when fetching Google Fonts at build time so
    // `next build` works in sandboxed environments with a custom TLS setup.
    turbopackUseSystemTlsCerts: true,
  },
};

module.exports = nextConfig;
