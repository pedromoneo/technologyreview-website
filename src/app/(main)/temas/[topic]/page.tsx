import { MOCK_ARTICLES } from "@/data/mock-articles";
import ArticleCard from "@/components/home/ArticleCard";
import { notFound } from "next/navigation";

interface TopicPageProps {
    params: Promise<{ topic: string }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
    const { topic } = await params;

    // Convert slug to readable name (e.g., 'inteligencia-artificial' -> 'Inteligencia artificial')
    const readableTopic = topic.split("-").join(" ");

    const filteredArticles = MOCK_ARTICLES.filter(
        (article) => article.category.toLowerCase() === readableTopic.toLowerCase()
    );

    if (filteredArticles.length === 0) {
        // Try a more flexible match for edge cases
        const flexibleArticles = MOCK_ARTICLES.filter(
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
