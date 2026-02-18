/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  allowedDevOrigins: ['10.1.1.63'],

  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://10.1.1.63:4000/api',
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL || 'http://10.1.1.63:4000',
  },
};

module.exports = nextConfig;
