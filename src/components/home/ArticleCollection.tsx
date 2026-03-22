"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SiteImage from "@/components/SiteImage";
import { getArticlePath } from "@/lib/article-url";
import { DEFAULT_ARTICLE_IMAGE } from "@/lib/site-image";

interface Article {
    id: string;
    slug?: string;
    legacySlug?: string;
    legacyPath?: string;
    title: string;
    excerpt: string;
    category: string;
    imageUrl: string;
    date: string;
}

interface CollectionData {
    id: string;
    sectionTitle?: string;
    title: string;
    subtitle: string;
    color: string;
    articleIds?: string[];
}

interface ArticleCollectionProps {
    collection: CollectionData;
    articles: Article[];
}

export default function ArticleCollection({ collection, articles }: ArticleCollectionProps) {
    const [scrollPosition, setScrollPosition] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const scrollAmount = window.innerWidth < 768 ? 280 : 400;
        const newPosition = direction === 'left'
            ? Math.max(0, container.scrollLeft - scrollAmount)
            : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);

        container.scrollTo({
            left: newPosition,
            behavior: 'smooth'
        });
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            setScrollPosition(scrollContainerRef.current.scrollLeft);
        }
    };

    if (!collection || articles.length === 0) return null;

    return (
        <section className="bg-gray-50 py-16 md:py-24 overflow-hidden border-y border-gray-100 w-full max-w-full">
            <div className="container mx-auto px-4 md:px-6 mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        {collection.sectionTitle && (
                            <span
                                className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] mb-3 block opacity-70"
                                style={{ color: collection.color }}
                            >
                                {collection.sectionTitle}
                            </span>
                        )}
                        <h2 className="text-[14px] md:text-[16px] font-black uppercase tracking-[0.2em] mb-4 block" style={{ color: collection.color }}>
                            {collection.title}
                        </h2>
                        <h3 className="text-3xl md:text-5xl font-black italic tracking-tighter text-primary leading-tight">
                            {collection.subtitle}
                        </h3>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 md:w-12 md:h-12 border border-gray-200 rounded-full flex items-center justify-center hover:bg-white transition-all active:scale-90 disabled:opacity-30"
                            disabled={scrollPosition <= 0}
                        >
                            <ChevronLeft className="w-5 h-5 text-primary" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 md:w-12 md:h-12 border border-gray-200 rounded-full flex items-center justify-center hover:bg-white transition-all active:scale-90"
                            style={{ backgroundColor: scrollPosition < 10 ? collection.color + '20' : 'transparent' }}
                        >
                            <ChevronRight className="w-5 h-5 text-primary" />
                        </button>
                    </div>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-6 overflow-x-auto px-4 md:px-6 scrollbar-hide pb-8 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>

                {articles.map((article, index) => (
                    <Link
                        key={article.id}
                        href={getArticlePath(article)}
                        className="flex-shrink-0 w-[280px] md:w-[380px] bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 group border border-gray-100 snap-start overflow-hidden flex flex-col h-full"
                    >
                        <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: collection.color }}></span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/50">
                                    {index + 1} de {articles.length}
                                </span>
                            </div>
                        </div>

                        <div className="relative aspect-[16/10] overflow-hidden">
                            <SiteImage
                                src={article.imageUrl || DEFAULT_ARTICLE_IMAGE}
                                alt={article.title}
                                fill
                                loading="lazy"
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                sizes="(max-width: 768px) 280px, 380px"
                            />
                        </div>

                        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                            <div>
                                <span
                                    className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-3 block"
                                    style={{ color: collection.color }}
                                >
                                    {article.category}
                                </span>
                                <h3 className="text-xl md:text-2xl font-black italic tracking-tighter text-primary leading-tight group-hover:text-primary transition-colors mb-3 line-clamp-3">
                                    {article.title}
                                </h3>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed line-clamp-3">
                                    {article.excerpt}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}

                <div className="flex-shrink-0 w-8 md:w-24" aria-hidden="true" />
            </div>
        </section>
    );
}
