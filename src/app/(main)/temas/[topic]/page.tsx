import { db } from "@/lib/firebase-admin";
import ArticleCard from "@/components/home/ArticleCard";
import { notFound } from "next/navigation";
import { slugify } from "@/lib/content-utils";

export const revalidate = 60;

interface TopicPageProps {
    params: Promise<{ topic: string }>;
    searchParams: Promise<{ q?: string }>;
}

const commonMappings: Record<string, string> = {
    "ia": "inteligencia-artificial",
    "ai": "inteligencia-artificial",
    "artificial-intelligence": "inteligencia-artificial"
};

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
    const { topic: rawTopic } = await params;
    const { q } = await searchParams;
    const topic = decodeURIComponent(rawTopic);

    if (!db) {
        console.error("Database not initialized");
        return notFound();
    }

    const snapshot = await db.collection("articles")
        .limit(1000)
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

    return renderTopicPage(topicDisplay, filteredArticles);
}

function renderTopicPage(topic: string, articles: any[]) {
    const topicDisplay = articles[0]?.category || topic;

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
            </main>
        </div>
    );
}
