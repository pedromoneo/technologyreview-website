import { db } from "@/lib/firebase-admin";
import Link from "next/link";
import { slugify } from "@/lib/content-utils";

export const revalidate = 3600; // Cache for 1 hour

export default async function TemasPage() {
    if (!db) return null;

    const snapshot = await db.collection("articles").get();
    const categories = new Set<string>();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) categories.add(data.category);
    });

    const sortedCategories = Array.from(categories).sort();

    return (
        <div className="pt-32 min-h-screen bg-white">
            <header className="border-b">
                <div className="container mx-auto px-6 py-12">
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-primary">
                        Temas
                    </h1>
                </div>
            </header>

            <main className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedCategories.map(category => (
                        <Link
                            key={category}
                            href={`/temas/${slugify(category)}`}
                            className="p-8 border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all group"
                        >
                            <h2 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                                {category}
                            </h2>
                            <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest group-hover:text-primary/60">
                                Ver artículos →
                            </p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
