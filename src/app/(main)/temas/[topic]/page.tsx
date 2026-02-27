import { db } from "@/lib/firebase-admin";
import ArticleCard from "@/components/home/ArticleCard";
import { notFound } from "next/navigation";
import { slugify } from "@/lib/content-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 600; // 10 minutes cache for topic pages

interface TopicPageProps {
    params: Promise<{ topic: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
}

const commonMappings: Record<string, string> = {
    "ia": "inteligencia-artificial",
    "ai": "inteligencia-artificial",
    "artificial-intelligence": "inteligencia-artificial"
};

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
    const { topic: rawTopic } = await params;
    const { q, page = "1" } = await searchParams;
    const topic = decodeURIComponent(rawTopic);
    const currentPage = parseInt(page);
    const pageSize = 15;

    if (!db) {
        console.error("Database not initialized");
        return notFound();
    }

    const snapshot = await db.collection("articles")
        .orderBy("migratedAt", "desc")
        .limit(500) // Efficient limit for search/topic fallback
        .get();

    const allArticles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title || "",
            excerpt: data.excerpt || "",
            content: data.content || "",
            category: data.category || "General",
            tags: data.tags || [],
            author: data.author || "Redacción",
            date: data.date || "",
            readingTime: data.readingTime || "1 min",
            imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
            migratedAt: data.migratedAt ? (data.migratedAt.toDate ? data.migratedAt.toDate() : new Date(data.migratedAt)) : new Date(0),
        };
    }).sort((a, b) => b.migratedAt.getTime() - a.migratedAt.getTime());

    let filteredArticles = [];
    let topicDisplay = "";

    const topicSlug = slugify(topic);
    const mappedTopicSlug = commonMappings[topicSlug] || topicSlug;

    const readableTopic = topic === "busqueda" ? "Búsqueda" : topic.split("-").join(" ");
    topicDisplay = readableTopic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    if (topic === "busqueda" && q) {
        const queryStr = q.toLowerCase();
        filteredArticles = allArticles.filter(article =>
            article.title?.toLowerCase().includes(queryStr) ||
            article.excerpt?.toLowerCase().includes(queryStr) ||
            article.content?.toLowerCase().includes(queryStr) ||
            article.category?.toLowerCase().includes(queryStr) ||
            (article.tags && Array.isArray(article.tags) && article.tags.some((tag: string) => tag.toLowerCase().includes(queryStr)))
        );
        topicDisplay = `Resultados para: ${q}`;
    } else {
        filteredArticles = allArticles.filter(
            (article) => {
                const articleCategory = article.category || "";
                const articleCategorySlug = slugify(articleCategory);
                const mappedArticleCategorySlug = commonMappings[articleCategorySlug] || articleCategorySlug;

                const matchesCategory =
                    articleCategory.toLowerCase() === readableTopic.toLowerCase() ||
                    articleCategorySlug === topicSlug ||
                    mappedArticleCategorySlug === mappedTopicSlug;

                const matchesTags = article.tags && Array.isArray(article.tags) && article.tags.some((tag: string) => {
                    const tagSlug = slugify(tag);
                    const mappedTagSlug = commonMappings[tagSlug] || tagSlug;
                    return tagSlug === topicSlug || mappedTagSlug === mappedTopicSlug;
                });

                return matchesCategory || matchesTags;
            }
        );
    }

    const totalArticles = filteredArticles.length;
    const totalPages = Math.ceil(totalArticles / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const paginatedArticles = filteredArticles.slice(startIdx, startIdx + pageSize);

    return renderTopicPage(topicDisplay, paginatedArticles, currentPage, totalPages, topic, q);
}

function renderTopicPage(topic: string, articles: any[], currentPage: number, totalPages: number, topicSlug: string, query?: string) {
    const topicDisplay = articles[0]?.category || topic;

    const getPageUrl = (page: number) => {
        const baseUrl = `/temas/${topicSlug}`;
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("page", page.toString());
        return `${baseUrl}?${params.toString()}`;
    };

    return (
        <div className="pt-32 min-h-screen bg-white">
            <header className="border-b">
                <div className="container mx-auto px-6 py-12">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-1 bg-accent" />
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Tema</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-primary">
                        {topicDisplay}
                    </h1>
                    {totalPages > 0 && (
                        <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Página {currentPage} de {totalPages} — {articles.length} artículos mostrados
                        </p>
                    )}
                </div>
            </header>

            <main className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
                    {articles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                    ))}
                </div>

                {articles.length === 0 && (
                    <div className="text-center py-40">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-lg">
                            No se encontraron artículos en este tema.
                        </p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-32 flex items-center justify-center space-x-4">
                        {currentPage > 1 ? (
                            <Link
                                href={getPageUrl(currentPage - 1)}
                                className="px-8 py-4 border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                Anterior
                            </Link>
                        ) : (
                            <span className="px-8 py-4 border-2 border-gray-100 text-gray-300 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                                Anterior
                            </span>
                        )}

                        <div className="flex space-x-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple logic to show near pages
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum + 2 > totalPages) pageNum = totalPages - 4 + i;
                                }
                                if (pageNum > totalPages || pageNum < 1) return null;

                                return (
                                    <Link
                                        key={pageNum}
                                        href={getPageUrl(pageNum)}
                                        className={`w-12 h-12 flex items-center justify-center text-[10px] font-black transition-all ${currentPage === pageNum ? "bg-accent text-primary" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                            }`}
                                    >
                                        {pageNum}
                                    </Link>
                                );
                            })}
                        </div>

                        {currentPage < totalPages ? (
                            <Link
                                href={getPageUrl(currentPage + 1)}
                                className="px-8 py-4 border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                Siguiente
                            </Link>
                        ) : (
                            <span className="px-8 py-4 border-2 border-gray-100 text-gray-300 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                                Siguiente
                            </span>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
