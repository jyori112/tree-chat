/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tree-chat/shared'],
  experimental: {
    // Disable sync dynamic APIs for compatibility with Clerk
    dynamicIO: false,
  },
  // Suppress warnings and errors related to headers() in development
  onDemandEntries: {
    // Development only optimization
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Suppress console warnings in development
  ...(process.env.NODE_ENV === 'development' && {
    eslint: {
      ignoreDuringBuilds: false,
    },
    typescript: {
      ignoreBuildErrors: false,
    }
  })
};

module.exports = nextConfig;