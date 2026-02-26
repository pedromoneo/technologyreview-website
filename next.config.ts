import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'wp.technologyreview.com',
      },
      {
        protocol: 'https',
        hostname: 'www.technologyreview.com',
      },
      {
        protocol: 'https',
        hostname: 'technologyreview.com',
      }
    ],
  },
};

export default nextConfig;
