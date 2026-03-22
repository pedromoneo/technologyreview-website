import { cache } from "react";
import { db } from "./firebase-admin";

const DEFAULT_TOPICS = [
    "Inteligencia Artificial",
    "Biotecnología",
    "Energía",
    "Espacio",
    "Sostenibilidad",
    "Negocios",
];

export const getCategories = cache(async (): Promise<string[]> => {
    if (!db) return DEFAULT_TOPICS;
    try {
        const snap = await db.collection("settings").doc("categories").get();
        return snap.exists ? (snap.data()?.list || DEFAULT_TOPICS) : DEFAULT_TOPICS;
    } catch (error) {
        console.error("Error fetching categories:", error);
        return DEFAULT_TOPICS;
    }
});

export const getFeaturedInformes = cache(async (): Promise<{ id: string; slug: string; title: string }[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection("informes")
            .where("status", "==", "featured")
            .limit(5)
            .get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                slug: data.slug || doc.id,
                title: data.title || "Informe",
            };
        });
    } catch (error) {
        console.error("Error fetching featured informes:", error);
        return [];
    }
});
