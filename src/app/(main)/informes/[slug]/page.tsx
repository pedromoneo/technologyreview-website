import { db } from "@/lib/firebase-admin";
import ArticleCard from "@/components/home/ArticleCard";
import { notFound } from "next/navigation";
import SiteImage from "@/components/SiteImage";
import ViewTracker from "@/components/ViewTracker";
import { DEFAULT_ARTICLE_IMAGE } from "@/lib/site-image";

export const revalidate = 3600; // 1 hour cache for informe pages

interface InformePageProps {
    params: Promise<{ slug: string }>;
}

export default async function InformePage({ params }: InformePageProps) {
    const { slug } = await params;

    if (!db) {
        console.error("Database not initialized");
        return notFound();
    }

    // Fetch informe by slug
    const informeSnapshot = await db.collection("informes")
        .where("slug", "==", slug)
        .where("status", "in", ["published", "featured"])
        .limit(1)
        .get();

    if (informeSnapshot.empty) {
        return notFound();
    }

    const informeData = informeSnapshot.docs[0].data();
    const articleIds = informeData.articleIds || [];

    // Fetch articles
    let articles = [];
    if (articleIds.length > 0) {
        // Firestore 'in' query is limited to 10-30 items depending on version, 
        // but we can just fetch all and filter or fetch in chunks if needed.
        // For simplicity and assuming most reports have < 30 articles:
        const articlesSnapshot = await db.collection("articles")
            .where("__name__", "in", articleIds.slice(0, 30))
            .get();

        const fetchedArticles = articlesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || "",
                excerpt: data.excerpt || "",
                author: data.author || "Redacción",
                date: data.date || "",
                readingTime: data.readingTime || "1 min",
                imageUrl: data.imageUrl || DEFAULT_ARTICLE_IMAGE,
                category: data.category || "General",
                publishedAt: data.publishedAt
            };
        });

        // Preserve order from articleIds
        articles = articleIds.map((id: string) => fetchedArticles.find(a => a.id === id)).filter(Boolean);
    }

    return (
        <main className="min-h-screen bg-white">
            <ViewTracker collectionName="informes" documentId={informeSnapshot.docs[0].id} />
            {/* Hero Section */}
            <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-primary">
                <SiteImage
                    src={informeData.imageUrl || DEFAULT_ARTICLE_IMAGE}
                    alt={informeData.title}
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="container mx-auto px-6 text-center max-w-4xl">
                        <div className="inline-block bg-accent text-primary px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in">
                            Informe Especial
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase mb-8 leading-[0.9]">
                            {informeData.title}
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-200 font-medium leading-relaxed max-w-2xl mx-auto">
                            {informeData.excerpt}
                        </p>
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className="container mx-auto px-6 py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {articles.map((article: any, index: number) => (
                        <div
                            key={article.id}
                            className="opacity-0 animate-fade-in-up"
                            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                        >
                            <ArticleCard article={article} />
                        </div>
                    ))}
                </div>

                {articles.length === 0 && (
                    <div className="text-center py-24">
                        <p className="text-gray-400 font-bold uppercase tracking-widest">No hay artículos en este informe aún.</p>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}} />
        </main>
    );
}
