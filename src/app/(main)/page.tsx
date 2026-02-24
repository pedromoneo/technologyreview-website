import { MOCK_ARTICLES } from "@/data/mock-articles";
import ArticleCard from "@/components/home/ArticleCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const featuredArticle = MOCK_ARTICLES[0];
  const latestArticles = MOCK_ARTICLES.slice(1);

  return (
    <div className="flex flex-col pt-28">
      {/* Hero Section - The Split Hero */}
      <section className="bg-primary">
        <ArticleCard article={featuredArticle} featured />
      </section>

      {/* Main Content Area */}
      <section className="container mx-auto px-6 py-24">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Topics Sidebar (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-32">
              <div className="flex items-center space-x-4 mb-10">
                <div className="w-8 h-[3px] bg-accent" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                  Temas
                </h3>
              </div>
              <ul className="space-y-6">
                {["Inteligencia Artificial", "Computación", "Biotecnología", "Energía", "Espacio", "Sostenibilidad", "Sociedad"].map((topic) => (
                  <li key={topic}>
                    <Link href={`/temas/${topic.toLowerCase().replace(/\s/g, "-")}`} className="group flex items-center text-sm font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest">
                      <span className="w-0 group-hover:w-4 h-[1px] bg-primary mr-0 group-hover:mr-2 transition-all" />
                      {topic}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-20 p-8 bg-muted border-t-4 border-primary">
                <h4 className="text-xl font-black mb-4 leading-tight tracking-tighter">Acceso Ilimitado</h4>
                <p className="text-sm text-gray-500 mb-6 font-medium">Suscríbete para leer todas nuestras historias sin límites.</p>
                <button className="w-full bg-primary text-white py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:text-primary transition-colors">
                  Ver Planes
                </button>
              </div>
            </div>
          </aside>

          {/* Article grid */}
          <div className="flex-1">
            <div className="flex items-center space-x-6 mb-16">
              <span className="bg-accent text-primary px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em]">Últimas Historias</span>
              <div className="flex-1 h-[1px] bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-20">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
              {/* More articles would go here */}
              {MOCK_ARTICLES.slice(0, 2).map((article) => (
                <ArticleCard key={article.id + "-extra"} article={article} />
              ))}
            </div>

            <div className="mt-24 text-center">
              <button className="border-2 border-primary text-primary px-12 py-4 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary hover:text-white transition-all">
                Cargar más historias
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-primary py-32 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-accent/5 -skew-x-12 transform translate-x-1/2" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-5xl md:text-7xl font-black mb-8 leading-[1] tracking-tighter italic">
                Descifra el futuro.
              </h2>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed font-medium">
                Recibe semanalmente las innovaciones que están moldeando nuestro mundo directamente en tu bandeja de entrada.
              </p>
              <div className="flex flex-col md:flex-row gap-4 max-w-xl">
                <input
                  type="email"
                  placeholder="TU@EMAIL.COM"
                  className="flex-1 bg-white/5 border-2 border-white/10 px-6 py-4 outline-none focus:border-accent transition-colors text-white font-black text-sm tracking-widest uppercase placeholder:text-gray-500"
                />
                <button className="bg-accent text-primary px-10 py-4 font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-colors flex items-center justify-center group whitespace-nowrap">
                  Suscríbete <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
