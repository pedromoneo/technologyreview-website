import { db } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import Image from "next/image";
import { cleanContent } from "@/lib/content-utils";

export const revalidate = 60;

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function StaticPage({ params }: PageProps) {
    const { slug } = await params;

    if (!db) return notFound();

    // Query for page with matching slug
    const snapshot = await db.collection("pages")
        .where("slug", "==", slug)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return notFound();
    }

    const pageData = snapshot.docs[0].data();
    const cleanedContent = cleanContent(pageData.content || "");

    return (
        <article className="min-h-screen bg-white">
            {/* Hero Section */}
            {pageData.headerImageUrl ? (
                <div className="relative h-[60vh] w-full">
                    <Image
                        src={pageData.headerImageUrl}
                        alt={pageData.title}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 py-20">
                        <div className="container mx-auto px-6">
                            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase text-primary leading-none">
                                {pageData.title}
                            </h1>
                            {pageData.subtitle && (
                                <p className="text-xl md:text-2xl font-bold text-gray-400 mt-6 max-w-3xl uppercase tracking-tight">
                                    {pageData.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <header className="pt-40 pb-20 border-b">
                    <div className="container mx-auto px-6 text-center">
                        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase text-primary leading-none">
                            {pageData.title}
                        </h1>
                        {pageData.subtitle && (
                            <p className="text-xl md:text-2xl font-bold text-gray-400 mt-6 max-w-3xl mx-auto uppercase tracking-tight">
                                {pageData.subtitle}
                            </p>
                        )}
                    </div>
                </header>
            )}

            {/* Content Section */}
            <main className="container mx-auto px-6 py-20 max-w-4xl">
                <div
                    className="prose prose-xl prose-primary mx-auto article-content"
                    dangerouslySetInnerHTML={{ __html: cleanedContent }}
                />
            </main>
        </article>
    );
}
