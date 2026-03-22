"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
    DEFAULT_ARTICLE_IMAGE,
    getDirectImageLoaderProps,
    getSafeSiteImageSrc,
} from "@/lib/site-image";

export default function SiteImage({ alt, src, onError, ...props }: ImageProps) {
    const normalizedSrc = typeof src === "string"
        ? getSafeSiteImageSrc(src)
        : src;
    const [currentSrc, setCurrentSrc] = useState<ImageProps["src"]>(normalizedSrc);

    useEffect(() => {
        setCurrentSrc(normalizedSrc);
    }, [normalizedSrc]);

    const srcValue = typeof currentSrc === "string" ? currentSrc : "";

    return (
        <Image
            alt={alt}
            src={currentSrc}
            {...props}
            {...getDirectImageLoaderProps(srcValue)}
            onError={(event) => {
                onError?.(event);

                if (typeof currentSrc === "string" && currentSrc !== DEFAULT_ARTICLE_IMAGE) {
                    setCurrentSrc(DEFAULT_ARTICLE_IMAGE);
                }
            }}
        />
    );
}
