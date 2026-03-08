import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { db } from "@/lib/firebase-admin";

export const revalidate = 600;

const DEFAULT_TOPICS = [
    "Inteligencia Artificial",
    "Biotecnología",
    "Energía",
    "Espacio",
    "Sostenibilidad",
    "Negocios"
];

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let topics = DEFAULT_TOPICS;
    let featuredInformes: { id: string; slug: string; title: string; }[] = [];

    if (db) {
        try {
            const [categoriesSnap, featuredInformesSnap] = await Promise.all([
                db.collection("settings").doc("categories").get(),
                db.collection("informes")
                    .where("status", "==", "featured")
                    .limit(2)
                    .get(),
            ]);

            if (categoriesSnap.exists) {
                topics = categoriesSnap.data()?.list || DEFAULT_TOPICS;
            }

            featuredInformes = featuredInformesSnap.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    slug: data.slug || doc.id,
                    title: data.title || "Informe",
                };
            });
        } catch (error) {
            console.error("Error loading shared navigation data:", error);
        }
    }

    return (
        <>
            <Navbar topics={topics} featuredInformes={featuredInformes} />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer />
        </>
    );
}
