import { db } from "@/lib/firebase-admin";
import ArticleCard from "@/components/home/ArticleCard";
import { notFound } from "next/navigation";

export const revalidate = 60;

interface TopicPageProps {
    params: Promise<{ topic: string }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
    const { topic } = await params;

    if (!db) {
        console.error("Database not initialized");
        return notFound();
    }

    const snapshot = await db.collection("articles")
        .orderBy("migratedAt", "desc")
        .limit(500)
        .get();

    const allArticles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title || "",
            excerpt: data.excerpt || "",
            category: data.category || "General",
            author: data.author || "Redacción",
            date: data.date || "",
            readingTime: data.readingTime || "1 min",
            imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
        };
    });

    const readableTopic = topic.split("-").join(" ");

    const filteredArticles = allArticles.filter(
        (article) => article.category.toLowerCase() === readableTopic.toLowerCase()
    );

    if (filteredArticles.length === 0) {
        const flexibleArticles = allArticles.filter(
            (article) => article.category.toLowerCase().includes(readableTopic.toLowerCase()) ||
                readableTopic.toLowerCase().includes(article.category.toLowerCase())
        );

        if (flexibleArticles.length === 0) {
            return notFound();
        }

        return renderTopicPage(topic, flexibleArticles);
    }

    return renderTopicPage(topic, filteredArticles);
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
