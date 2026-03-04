import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  images: {
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
      },
      {
        protocol: 'https',
        hostname: 'technologyreview.es',
      }
    ],
    unoptimized: true,
  },
};

export default nextConfig;
