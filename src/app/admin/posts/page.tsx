"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { Plus, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminPostsPage() {
    const [articles, setArticles] = useState<any[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Todos");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    async function fetchArticles() {
        try {
            setLoading(true);
            const q = query(collection(db, "articles"), orderBy("migratedAt", "desc"), limit(200)); // Increased limit for better range
            const snapshot = await getDocs(q);
            const fetchedArticles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setArticles(fetchedArticles);
            setFilteredArticles(fetchedArticles);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchArticles();
    }, []);

    useEffect(() => {
        let result = articles;
        if (activeTab === "Publicados") {
            result = articles.filter(a => a.status === "published" || !a.status);
        } else if (activeTab === "Borradores") {
            result = articles.filter(a => a.status === "draft");
        } else if (activeTab === "Destacados") {
            result = articles.filter(a => a.status === "featured");
        }
        setFilteredArticles(result);
        setCurrentPage(1); // Reset to first page when tab changes
    }, [activeTab, articles]);

    const totalPages = Math.ceil(filteredArticles.length / pageSize);
    const currentArticles = filteredArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    const getStatusInfo = (status: string) => {
        switch (status) {
            case "published":
                return { label: "Publicado", color: "bg-emerald-500", textColor: "text-emerald-600" };
            case "draft":
                return { label: "Borrador", color: "bg-gray-400", textColor: "text-gray-500" };
            case "featured":
                return { label: "Destacado", color: "bg-amber-500", textColor: "text-amber-600" };
            default:
                return { label: "Publicado", color: "bg-emerald-500", textColor: "text-emerald-600" };
        }
    };

    return (
        <div className="p-8 pb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Artículos</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Gestiona las historias publicadas</p>
                </div>

                <Link href="/admin/posts/new" className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform" />
                    Nuevo
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-sm group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar contenido..."
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    const filtered = articles.filter(a =>
                                        a.title.toLowerCase().includes(val) ||
                                        a.author?.toLowerCase().includes(val)
                                    );
                                    setFilteredArticles(filtered);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-gray-50 border border-transparent rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                        <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <Filter className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {["Todos", "Publicados", "Destacados", "Borradores"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? "bg-primary text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
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
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Artículo</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Categoría</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Autor</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Fecha</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentArticles.map((article) => {
                                const statusInfo = getStatusInfo(article.status);
                                return (
                                    <tr key={article.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <Image src={article.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"} alt={article.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[11px] font-black uppercase tracking-tight line-clamp-2 max-w-sm mb-0.5">{article.title}</p>
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
                                                        <span className={`text-[8px] font-black uppercase tracking-widest ${statusInfo.textColor}`}>{statusInfo.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-primary/5">
                                                {article.category || "General"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-black text-primary">
                                                    {article.author ? article.author[0] : "R"}
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{article.author || "Redacción"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[9px] font-bold text-gray-400 tabular-nums">{article.date || "Fecha desconocida"}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Link href={`/articulos/${article.id}`} target="_blank" title="Ver" className="p-1.5 hover:bg-primary/5 rounded-md transition-colors group/icon">
                                                    <Eye className="w-3.5 h-3.5 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <Link href={`/admin/posts/edit/${article.id}`} title="Editar" className="p-1.5 hover:bg-primary/5 rounded-md transition-colors group/icon">
                                                    <Edit className="w-3.5 h-3.5 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(article.id, article.title)}
                                                    title="Eliminar"
                                                    className="p-1.5 hover:bg-rose-50 rounded-md transition-colors group/icon"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover/icon:text-rose-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Mostrando {Math.min(filteredArticles.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredArticles.length, currentPage * pageSize)} de {filteredArticles.length} artículos
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 bg-white border border-gray-100 rounded text-[9px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-white border border-gray-100 rounded text-[9px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
