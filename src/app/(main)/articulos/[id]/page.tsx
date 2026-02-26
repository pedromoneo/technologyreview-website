import { db } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clock, User, Share2, Facebook, Twitter, Linkedin, ArrowLeft } from "lucide-react";
import { cleanContent } from "@/lib/content-utils";
import DOMPurify from "isomorphic-dompurify";

export const revalidate = 3600; // 1 hour revalidation

interface ArticlePageProps {
    params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
    const { id } = await params;

    if (!db) {
        console.error("Database not initialized");
        return notFound();
    }

    try {
        const docSnap = await db.collection("articles").doc(id).get();
        if (!docSnap.exists) {
            return notFound();
        }

        const data = docSnap.data()!;
        const article = {
            id: docSnap.id,
            title: data.title || "",
            excerpt: data.excerpt || "",
            category: data.category || "General",
            author: data.author || "Redacción",
            date: data.date || "",
            readingTime: data.readingTime || "1 min",
            imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
            content: data.content || ""
        };

        const relatedSnap = await db.collection("articles")
            .orderBy("migratedAt", "desc")
            .limit(4)
            .get();

        const relatedArticles = relatedSnap.docs
            .filter(d => d.id !== id)
            .map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    title: d.title || "",
                    excerpt: d.excerpt || "",
                    category: d.category || "General",
                    author: d.author || "Redacción",
                    date: d.date || "",
                    readingTime: d.readingTime || "1 min",
                    imageUrl: d.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800",
                };
            })
            .slice(0, 3);

        return (
            <article className="pt-28 bg-white min-h-screen">
                {/* Minimal Header Nav */}
                <div className="border-b bg-gray-50/50">
                    <div className="container mx-auto px-6 py-4 flex items-center">
                        <Link href="/" className="flex items-center text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                            <ArrowLeft className="w-3 h-3 mr-2" />
                            Volver al inicio
                        </Link>
                    </div>
                </div>

                {/* Article Hero */}
                <header className="py-16 md:py-24 border-b">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <Link href={`/temas/${article.category.toLowerCase().replace(/\s/g, "-")}`} className="inline-block bg-accent/20 text-primary px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] mb-8 hover:bg-accent transition-colors">
                            {article.category}
                        </Link>

                        <h1 className="text-4xl md:text-7xl font-black mb-10 leading-[0.95] tracking-tighter">
                            {article.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-y-4 gap-x-12 pt-8 border-t border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary/40" />
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase font-black tracking-widest text-gray-400 mb-0.5">Por</span>
                                    <span className="block text-sm font-black text-primary uppercase tracking-tight">{article.author}</span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-12">
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 text-accent mr-3" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{article.readingTime}</span>
                                </div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                    {article.date}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="container mx-auto px-6 py-16 max-w-7xl lg:flex gap-20">
                    {/* Main Content */}
                    <div className="flex-1 max-w-3xl">
                        <div className="relative aspect-[16/9] mb-12 overflow-hidden group">
                            <Image
                                src={article.imageUrl}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                            />
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none" />
                        </div>

                        <div className="prose prose-xl prose-primary max-w-none">
                            <p className="text-2xl font-bold leading-relaxed text-gray-600 mb-10 border-l-4 border-accent pl-8 italic">
                                {article.excerpt.replace(/rnrn/g, ' ').replace(/rn/g, ' ').replace(/\\_/g, ' ')}
                            </p>

                            <div
                                className="space-y-8 text-gray-800 text-lg leading-loose font-medium article-content"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanContent(article.content)) }}
                            />
                        </div>

                        {/* Social Share */}
                        <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compartir</span>
                                <div className="flex space-x-2">
                                    {[Facebook, Twitter, Linkedin, Share2].map((Icon, i) => (
                                        <button key={i} className="w-10 h-10 border-2 border-gray-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all text-primary">
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar related articles */}
                    <aside className="w-full lg:w-80 space-y-16 mt-20 lg:mt-0">
                        <div className="sticky top-32">
                            <div className="flex items-center space-x-4 mb-10">
                                <div className="w-8 h-[3px] bg-accent" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Relacionados</h3>
                            </div>
                            <div className="space-y-12">
                                {relatedArticles.map((ra) => (
                                    <Link key={ra.id} href={`/articulos/${ra.id}`} className="group block">
                                        <div className="relative aspect-video mb-4 overflow-hidden">
                                            <Image src={ra.imageUrl} alt={ra.title} fill className="object-cover transition-transform group-hover:scale-110 duration-500" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent mb-2 block">{ra.category}</span>
                                        <h4 className="text-sm font-black uppercase tracking-tight leading-tight group-hover:text-accent transition-colors">
                                            {ra.title}
                                        </h4>
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-20 p-8 bg-primary text-white">
                                <h4 className="text-xl font-black italic tracking-tighter mb-4">Lo más leído</h4>
                                <div className="space-y-6">
                                    {[1, 2, 3].map((num) => (
                                        <div key={num} className="flex gap-4">
                                            <span className="text-4xl font-black text-accent italic opacity-50">{num}</span>
                                            <p className="text-xs font-bold leading-tight uppercase tracking-tight line-clamp-2">Cómo la IA está transformando el diagnóstico médico en 2026</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </article>
        );
    } catch (error) {
        console.error("Error fetching article:", error);
        return notFound();
    }
}
