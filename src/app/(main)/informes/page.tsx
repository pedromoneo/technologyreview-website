import { db } from "@/lib/firebase-admin";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export const metadata = {
    title: "Informes | MIT Technology Review en español",
    description: "Informes especiales y reportajes en profundidad sobre las tecnologías que están transformando el mundo.",
};

export default async function InformesPage() {
    if (!db) return null;

    let informes: any[] = [];
    try {
        const snapshot = await db.collection("informes")
            .where("status", "in", ["published", "featured"])
            .orderBy("createdAt", "desc")
            .get();

        informes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error("Error fetching informes:", error);
    }

    return (
        <div className="pt-32 min-h-screen bg-white">
            <header className="border-b">
                <div className="container mx-auto px-6 py-12">
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-primary">
                        Informes
                    </h1>
                    <p className="text-lg text-gray-500 mt-4 max-w-2xl font-medium">
                        Reportajes en profundidad y análisis especiales sobre las tecnologías que están transformando nuestro mundo.
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-6 py-20">
                {informes.length === 0 ? (
                    <div className="text-center py-24">
                        <p className="text-gray-400 font-bold uppercase tracking-widest">
                            No hay informes publicados aún.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {informes.map((informe) => (
                            <Link
                                key={informe.id}
                                href={`/informes/${informe.slug}`}
                                className="group block overflow-hidden border-2 border-gray-100 hover:border-accent transition-all"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                                    <Image
                                        src={informe.imageUrl || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"}
                                        alt={informe.title}
                                        fill
                                        loading="lazy"
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <div className="absolute bottom-4 left-4">
                                        <span className="bg-accent text-primary text-[9px] font-black tracking-widest uppercase px-2 py-0.5">
                                            Informe Especial
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h2 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">
                                        {informe.title}
                                    </h2>
                                    {informe.excerpt && (
                                        <p className="text-sm text-gray-500 mt-3 line-clamp-3 leading-relaxed">
                                            {informe.excerpt}
                                        </p>
                                    )}
                                    <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest group-hover:text-primary/60">
                                        Leer informe →
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
