import { db } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import ArticlePageView from "@/components/article/ArticlePageView";

export const revalidate = 3600;

function mapArticle(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
    const data = doc.data() || {};
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
        content: data.content || "",
    };
}

export async function generateStaticParams() {
    if (!db) return [];

    try {
        const articlesSnap = await db.collection("articles")
            .where("status", "in", ["published", "featured"])
            .orderBy("publishedAt", "desc")
            .limit(20)
            .get();

        return articlesSnap.docs
            .map((doc) => {
                const data = doc.data();
                const slug = data.legacySlug || data.slug || null;
                return slug ? { slug } : null;
            })
            .filter(Boolean) as { slug: string }[];
    } catch (error) {
        console.error("Error generating article slug params", error);
        return [];
    }
}

interface ArticleSlugPageProps {
    params: Promise<{ slug: string }>;
}

export default async function ArticleSlugPage({ params }: ArticleSlugPageProps) {
    const { slug } = await params;

    if (!db) {
        return notFound();
    }

    try {
        // Try by legacySlug first, then slug field, then document ID
        const docByLegacySlug = await db.collection("articles")
            .where("legacySlug", "==", slug)
            .limit(1)
            .get();

        let docSnap: FirebaseFirestore.DocumentSnapshot;

        if (!docByLegacySlug.empty) {
            docSnap = docByLegacySlug.docs[0];
        } else {
            const docBySlug = await db.collection("articles")
                .where("slug", "==", slug)
                .limit(1)
                .get();

            if (!docBySlug.empty) {
                docSnap = docBySlug.docs[0];
            } else {
                // Fall back to document ID lookup (some articles use the slug as their doc ID)
                const docById = await db.collection("articles").doc(slug).get();
                if (!docById.exists) {
                    return notFound();
                }
                docSnap = docById;
            }
        }
        const article = mapArticle(docSnap);

        const relatedSnap = await db.collection("articles")
            .orderBy("migratedAt", "desc")
            .limit(4)
            .get();

        const relatedArticles = relatedSnap.docs
            .filter((doc) => doc.id !== docSnap.id)
            .map((doc) => mapArticle(doc))
            .slice(0, 3);

        return <ArticlePageView article={article} relatedArticles={relatedArticles} />;
    } catch (error) {
        console.error("Error fetching article by slug:", error);
        return notFound();
    }
}
