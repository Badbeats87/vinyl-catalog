/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  redirects: async () => [],
  serverRuntimeConfig: {
    port: 3001,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
