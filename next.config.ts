/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: {
    autoPreload: false,
  },
};

export default nextConfig;