import type { ImageLoaderProps } from "next/image";

export const DEFAULT_ARTICLE_IMAGE = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800";

const TECH_REVIEW_HOSTS = [
    "technologyreview.com",
    "technologyreview.es",
];
const WORDPRESS_ATTACHMENT_PATH_SEGMENT = "/attachment/";
const WORDPRESS_UPLOADS_PATH_SEGMENT = "/wp-content/uploads/";
const WORDPRESS_ATTACHMENT_PARAM = "attachment_id";

function isTechReviewHost(hostname: string) {
    return TECH_REVIEW_HOSTS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function isUnsplashHost(hostname: string) {
    return hostname === "images.unsplash.com" || hostname.endsWith(".unsplash.com");
}


export function isWordPressAttachmentPageUrl(src: string) {
    if (!src || src.startsWith("/")) return false;

    try {
        const url = new URL(src);
        if (!isTechReviewHost(url.hostname)) return false;

        return (
            url.searchParams.has(WORDPRESS_ATTACHMENT_PARAM) ||
            (url.pathname.includes(WORDPRESS_ATTACHMENT_PATH_SEGMENT) &&
                !url.pathname.includes(WORDPRESS_UPLOADS_PATH_SEGMENT))
        );
    } catch {
        return false;
    }
}

export function getSafeSiteImageSrc(src: string | null | undefined, fallback = DEFAULT_ARTICLE_IMAGE) {
    if (!src) return fallback;

    try {
        const url = new URL(src);
        url.protocol = "https:";
        const normalizedUrl = url.toString();

        return isWordPressAttachmentPageUrl(normalizedUrl) ? fallback : normalizedUrl;
    } catch {
        return fallback;
    }
}

export function canUseDirectResponsiveImage(src: string) {
    if (!src || src.startsWith("/") || isWordPressAttachmentPageUrl(src)) return false;

    try {
        const url = new URL(src);
        // Firebase Storage images go through Next.js /_next/image for optimization
        // Only WordPress and Unsplash have their own resize APIs
        return isTechReviewHost(url.hostname) || isUnsplashHost(url.hostname);
    } catch {
        return false;
    }
}

export function siteImageLoader({ src, width, quality }: ImageLoaderProps) {
    try {
        const url = new URL(src);
        url.protocol = "https:";

        if (isTechReviewHost(url.hostname)) {
            // Ask the WordPress source to resize before the browser downloads it.
            url.searchParams.delete("h");
            url.searchParams.delete("height");
            url.searchParams.delete("crop");
            url.searchParams.delete("fit");
            url.searchParams.set("w", String(width));
            url.searchParams.set("q", String(quality || 75));
            return url.toString();
        }

        if (isUnsplashHost(url.hostname)) {
            url.searchParams.set("w", String(width));
            url.searchParams.set("q", String(quality || 75));
            url.searchParams.set("auto", "format");
            url.searchParams.set("fit", url.searchParams.get("fit") || "crop");
            return url.toString();
        }

        // Firebase Storage images are NOT handled here — they go through
        // Next.js /_next/image optimization for proper resizing and webp conversion
        return src;
    } catch {
        return src;
    }
}

export function getDirectImageLoaderProps(src: string) {
    if (!canUseDirectResponsiveImage(src)) {
        return {};
    }

    return {
        loader: siteImageLoader,
    };
}
