import Link from "next/link";
import Image from "next/image";
import { Article } from "@/data/mock-articles";
import { cleanExcerpt } from "@/lib/content-utils";

interface ArticleCardProps {
    article: Article;
    featured?: boolean;
}

export default function ArticleCard({ article, featured = false }: ArticleCardProps) {
    if (featured) {
        return (
            <Link href={`/articulos/${article.id}`} className="group relative overflow-hidden bg-primary text-white flex flex-col md:flex-row min-h-[500px] hover:bg-black transition-colors">
                {/* Image Container */}
                <div className="relative w-full md:w-1/2 h-80 md:h-[600px] overflow-hidden">
                    <Image
                        src={article.imageUrl}
                        alt={article.title}
                        fill
                        priority
                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                </div>
                {/* Content Container */}
                <div className="w-full md:w-1/2 p-10 md:p-20 flex flex-col justify-center">
                    <span className="inline-block bg-accent text-primary text-[11px] font-black tracking-[0.2em] uppercase px-3 py-1 mb-8 self-start">
                        {article.category}
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.05] tracking-tighter">
                        {article.title}
                    </h2>
                    <p className="text-gray-300 text-lg mb-10 leading-relaxed max-w-xl">
                        {cleanExcerpt(article.excerpt)}
                    </p>
                    <div className="flex items-center space-x-6 text-[11px] font-black uppercase tracking-widest text-accent">
                        <span>{article.author}</span>
                        <span className="opacity-30">•</span>
                        <span>{article.readingTime} de lectura</span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/articulos/${article.id}`} className="group block">
            <div className="relative aspect-[16/10] mb-8 overflow-hidden bg-gray-100">
                <Image
                    src={article.imageUrl}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                    <span className="bg-accent text-primary text-[9px] font-black tracking-widest uppercase px-2 py-0.5">
                        {article.category}
                    </span>
                </div>
            </div>

            <h3 className="text-2xl font-black leading-[1.2] mb-4 tracking-tighter group-hover:text-primary transition-colors decoration-primary/30 group-hover:underline underline-offset-4">
                {article.title}
            </h3>

            <p className="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-3">
                {cleanExcerpt(article.excerpt)}
            </p>

            <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>{article.author}</span>
                <span className="opacity-20">•</span>
                <span>{article.readingTime}</span>
            </div>
        </Link>
    );
}
