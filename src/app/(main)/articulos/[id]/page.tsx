import { db } from "@/lib/firebase-admin";
import { getArticlePath } from "@/lib/article-url";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 3600;

interface ArticleRedirectPageProps {
    params: Promise<{ id: string }>;
}

export default async function ArticleRedirectPage({ params }: ArticleRedirectPageProps) {
    const { id } = await params;

    if (!db) {
        return notFound();
    }

    // Try by document ID first
    const docSnap = await db.collection("articles").doc(id).get();
    if (docSnap.exists) {
        const targetPath = getArticlePath({
            id: docSnap.id,
            ...docSnap.data(),
        });
        permanentRedirect(targetPath);
    }

    // Fall back to slug lookup (handles /articulos/some-slug URLs)
    const byLegacySlug = await db.collection("articles")
        .where("legacySlug", "==", id)
        .limit(1)
        .get();

    const bySlug = byLegacySlug.empty
        ? await db.collection("articles").where("slug", "==", id).limit(1).get()
        : byLegacySlug;

    if (bySlug.empty) {
        return notFound();
    }

    const matchedDoc = bySlug.docs[0];
    const targetPath = getArticlePath({
        id: matchedDoc.id,
        ...matchedDoc.data(),
    });

    permanentRedirect(targetPath);
}
