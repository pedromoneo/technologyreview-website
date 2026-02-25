"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminPostsPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchArticles() {
        try {
            setLoading(true);
            const q = query(collection(db, "articles"), orderBy("migratedAt", "desc"), limit(20));
            const snapshot = await getDocs(q);
            const fetchedArticles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setArticles(fetchedArticles);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchArticles();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar "${title}"?`)) {
            try {
                await deleteDoc(doc(db, "articles", id));
                setArticles(articles.filter(a => a.id !== id));
            } catch (error) {
                console.error("Error deleting article:", error);
                alert("Error al eliminar el artículo");
            }
        }
    };

    return (
        <div className="p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Artículos</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Gestiona las historias publicadas</p>
                </div>

                <Link href="/admin/posts/new" className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Nuevo Artículo
                </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar por título o autor..."
                                className="w-full bg-gray-50 border-2 border-transparent rounded-xl pl-12 pr-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                        <button className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <Filter className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {["Todos", "Publicados", "Borradores"].map((tab) => (
                            <button key={tab} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "Todos" ? "bg-primary text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                }`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Artículo</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Autor</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Fecha</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {articles.map((article) => (
                                <tr key={article.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center space-x-6">
                                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                <Image src={article.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-black uppercase tracking-tight line-clamp-2 max-w-sm mb-1">{article.title}</p>
                                                <div className="flex items-center space-x-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Publicado</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-primary/5">
                                            {article.category || "General"}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-black text-primary">
                                                {article.author ? article.author[0] : "R"}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{article.author || "Redacción"}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className="text-[10px] font-bold text-gray-400 tabular-nums">{article.date || "Fecha desconocida"}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link href={`/articulos/${article.id}`} target="_blank" className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                <Eye className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                            </Link>
                                            <Link href={`/admin/posts/edit/${article.id}`} className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                <Edit className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(article.id, article.title)}
                                                className="p-2.5 hover:bg-rose-50 rounded-xl transition-colors group/icon"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-400 group-hover/icon:text-rose-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mostrando {articles.length} de {articles.length} artículos</p>
                    <div className="flex gap-2">
                        <button disabled className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-300">Anterior</button>
                        <button disabled className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-300">Siguiente</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
