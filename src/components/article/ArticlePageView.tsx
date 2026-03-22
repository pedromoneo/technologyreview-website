import SiteImage from "@/components/SiteImage";
import Link from "next/link";
import { Clock, User, Share2, Facebook, Twitter, Linkedin, ArrowLeft } from "lucide-react";
import { cleanContent, cleanExcerpt, truncateToSentence } from "@/lib/content-utils";
import DOMPurify from "isomorphic-dompurify";
import ViewTracker from "@/components/ViewTracker";
import { getArticlePath } from "@/lib/article-url";

interface ArticleData {
    id: string;
    title: string;
    excerpt: string;
    category: string;
    author: string;
    date: string;
    readingTime: string;
    imageUrl: string;
    content: string;
    slug?: string;
    legacySlug?: string;
    legacyPath?: string;
}

interface ArticlePageViewProps {
    article: ArticleData;
    relatedArticles: ArticleData[];
}

export default function ArticlePageView({ article, relatedArticles }: ArticlePageViewProps) {
    return (
        <article className="pt-28 bg-white min-h-screen">
            <ViewTracker collectionName="articles" documentId={article.id} />
            <div className="border-b bg-gray-50/50">
                <div className="container mx-auto px-6 py-4 flex items-center">
                    <Link href="/" className="flex items-center text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                        <ArrowLeft className="w-3 h-3 mr-2" />
                        Volver al inicio
                    </Link>
                </div>
            </div>

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
                <div className="flex-1 max-w-3xl">
                    <div className="relative aspect-[16/9] mb-12 overflow-hidden group">
                        <SiteImage
                            src={article.imageUrl}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            priority
                            quality={100}
                            sizes="(max-width: 768px) 100vw, 800px"
                        />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none" />
                    </div>

                    <div className="prose prose-xl prose-primary max-w-none">
                        {(() => {
                            const cleaned = cleanContent(article.content);
                            const finalExcerpt = truncateToSentence(cleanExcerpt(article.excerpt), 350);

                            let destacadoText = finalExcerpt;
                            let bodyContent = cleaned;

                            const firstPEnd = cleaned.indexOf("</p>");
                            if (firstPEnd !== -1) {
                                const firstP = cleaned.substring(0, firstPEnd + 4);
                                const plainFirstP = firstP.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
                                const matchLimit = Math.min(60, destacadoText.length);

                                if (destacadoText && plainFirstP.includes(destacadoText.substring(0, matchLimit))) {
                                    if (plainFirstP.length <= 480) {
                                        destacadoText = plainFirstP;
                                        bodyContent = cleaned.substring(firstPEnd + 4);
                                    } else {
                                        destacadoText = truncateToSentence(plainFirstP, 450);
                                        const cutoff = plainFirstP.indexOf(destacadoText.substring(destacadoText.length - 20));
                                        const remainder = cutoff !== -1 ? plainFirstP.substring(cutoff + 20).trim() : "";

                                        if (remainder.length > 50) {
                                            bodyContent = `<p class="mb-8">${remainder}</p>` + cleaned.substring(firstPEnd + 4);
                                        } else {
                                            bodyContent = cleaned.substring(firstPEnd + 4);
                                        }
                                    }
                                }
                            }

                            return (
                                <>
                                    {destacadoText && (
                                        <p className="text-2xl font-bold leading-relaxed text-gray-600 mb-10 border-l-4 border-accent pl-8 italic">
                                            {destacadoText}
                                        </p>
                                    )}
                                    <div
                                        className="space-y-8 text-gray-800 text-lg leading-loose font-medium article-content"
                                        dangerouslySetInnerHTML={{
                                            __html: DOMPurify.sanitize(bodyContent, {
                                                ADD_TAGS: ["figure", "figcaption", "img", "iframe"],
                                                ADD_ATTR: ["src", "alt", "class", "width", "height", "loading", "allow", "allowfullscreen", "frameborder"],
                                            }),
                                        }}
                                    />
                                </>
                            );
                        })()}
                    </div>

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

                <aside className="w-full lg:w-80 space-y-16 mt-20 lg:mt-0">
                    <div className="sticky top-32">
                        <div className="flex items-center space-x-4 mb-10">
                            <div className="w-8 h-[3px] bg-accent" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Relacionados</h3>
                        </div>
                        <div className="space-y-12">
                            {relatedArticles.map((relatedArticle) => (
                                <Link key={relatedArticle.id} href={getArticlePath(relatedArticle)} className="group block">
                                    <div className="relative aspect-video mb-4 overflow-hidden">
                                        <SiteImage
                                            src={relatedArticle.imageUrl}
                                            alt={relatedArticle.title}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-110 duration-500"
                                            sizes="(max-width: 768px) 100vw, 320px"
                                        />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent mb-2 block">{relatedArticle.category}</span>
                                    <h4 className="text-sm font-black uppercase tracking-tight leading-tight group-hover:text-accent transition-colors">
                                        {relatedArticle.title}
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
}
