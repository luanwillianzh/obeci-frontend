/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: {
    autoPreload: false,
  },
  experimental: {
    allowedDevOrigins: [
      "localhost",
      "127.0.0.1",
      "26.63.103.253",
    ],
  },
};

export default nextConfig;