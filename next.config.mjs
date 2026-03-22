import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: path.resolve("."),
    serverExternalPackages: ['firebase-admin'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**.unsplash.com' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
            { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
            { protocol: 'https', hostname: '**.googleapis.com' },
            { protocol: 'https', hostname: '**.technologyreview.com' },
            { protocol: 'http', hostname: '**.technologyreview.com' },
            { protocol: 'https', hostname: 'technologyreview.com' },
            { protocol: 'http', hostname: 'technologyreview.com' },
            { protocol: 'https', hostname: '**.technologyreview.es' },
            { protocol: 'http', hostname: '**.technologyreview.es' },
            { protocol: 'https', hostname: 'technologyreview.es' },
            { protocol: 'http', hostname: 'technologyreview.es' },
            { protocol: 'https', hostname: 'www.technologyreview.es' },
            { protocol: 'http', hostname: 'www.technologyreview.es' },
        ],
        formats: ['image/webp'],
        quality: 90,
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 31536000,
    },
};

export default nextConfig;
