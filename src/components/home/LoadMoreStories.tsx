"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    startAfter,
    Timestamp
} from "firebase/firestore";
import ArticleCard from "./ArticleCard";

interface Article {
    id: string;
    slug?: string;
    legacySlug?: string;
    legacyPath?: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    readingTime: string;
    imageUrl: string;
    publishedAt?: any;
}

interface LoadMoreStoriesProps {
    initialLastTimestamp: { seconds: number; nanoseconds: number };
    excludedIds: string[];
}

export default function LoadMoreStories({ initialLastTimestamp, excludedIds }: LoadMoreStoriesProps) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [lastTimestamp, setLastTimestamp] = useState<{ seconds: number; nanoseconds: number } | null>(initialLastTimestamp);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const loadMore = async () => {
        if (loading || !hasMore || !lastTimestamp) return;

        setLoading(true);
        try {
            const firestoreTimestamp = new Timestamp(lastTimestamp.seconds, lastTimestamp.nanoseconds);

            const q = query(
                collection(db, "articles"),
                where("status", "in", ["published", "featured"]),
                orderBy("publishedAt", "desc"),
                startAfter(firestoreTimestamp),
                limit(12)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            const newArticles = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        slug: data.slug || "",
                        legacySlug: data.legacySlug || "",
                        legacyPath: data.legacyPath || "",
                        title: data.title || "",
                        excerpt: data.excerpt || "",
                        category: data.category || "General",
                        author: data.author || "Redacción",
                        date: data.date || "",
                        readingTime: data.readingTime || "1 min",
                        imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
                        publishedAt: data.publishedAt
                    } as Article;
                })
                .filter(article => !excludedIds.includes(article.id));

            if (newArticles.length > 0) {
                setArticles(prev => [...prev, ...newArticles]);
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                const lastPubAt = lastDoc.data().publishedAt;
                if (lastPubAt) {
                    setLastTimestamp({
                        seconds: lastPubAt.seconds,
                        nanoseconds: lastPubAt.nanoseconds
                    });
                }
            }

            if (snapshot.docs.length < 12) {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more stories:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {articles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-20 mt-20">
                    {articles.map((article) => (
                        <ArticleCard key={article.id} article={article as any} />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="mt-24 text-center">
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="border-2 border-primary text-primary px-12 py-4 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Cargando..." : "Cargar más historias"}
                    </button>
                </div>
            )}
        </>
    );
}
