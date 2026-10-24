/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the development bundle separate so a production build cannot replace
  // the scripts used by an open localhost session.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: false,
  devIndicators: {
    buildActivity: false,
  },
};

module.exports = nextConfig;
