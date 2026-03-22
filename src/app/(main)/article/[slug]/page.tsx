import { db } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import ArticlePageView from "@/components/article/ArticlePageView";
import { DEFAULT_ARTICLE_IMAGE } from "@/lib/site-image";

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
        imageUrl: data.imageUrl || DEFAULT_ARTICLE_IMAGE,
        content: data.content || "",
    };
}

export async function generateStaticParams() {
    if (!db) return [];

    try {
        const articlesSnap = await db.collection("articles")
            .where("status", "in", ["published", "featured"])
            .orderBy("publishedAt", "desc")
            .limit(100)
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
        // Run legacySlug and slug queries in parallel, plus related articles
        const [docByLegacySlug, docBySlug, relatedSnap] = await Promise.all([
            db.collection("articles").where("legacySlug", "==", slug).limit(1).get(),
            db.collection("articles").where("slug", "==", slug).limit(1).get(),
            db.collection("articles").orderBy("migratedAt", "desc").limit(4).get(),
        ]);

        let docSnap: FirebaseFirestore.DocumentSnapshot;

        if (!docByLegacySlug.empty) {
            docSnap = docByLegacySlug.docs[0];
        } else if (!docBySlug.empty) {
            docSnap = docBySlug.docs[0];
        } else {
            // Fall back to document ID lookup (some articles use the slug as their doc ID)
            const docById = await db.collection("articles").doc(slug).get();
            if (!docById.exists) {
                return notFound();
            }
            docSnap = docById;
        }
        const article = mapArticle(docSnap);

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
