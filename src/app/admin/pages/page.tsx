"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { FileText, Plus, Search, Edit, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminPagesPage() {
    const [pages, setPages] = useState<any[]>([]);
    const [filteredPages, setFilteredPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Todos");

    async function fetchPages() {
        try {
            setLoading(true);
            const q = query(collection(db, "pages"), orderBy("updatedAt", "desc"));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPages(fetched);
            setFilteredPages(fetched);
        } catch (error) {
            console.error("Error fetching pages:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (activeTab === "Todos") {
            setFilteredPages(pages);
        } else if (activeTab === "Publicados") {
            setFilteredPages(pages.filter(p => p.status === "published" || !p.status));
        } else if (activeTab === "Borradores") {
            setFilteredPages(pages.filter(p => p.status === "draft"));
        } else if (activeTab === "Destacados") {
            setFilteredPages(pages.filter(p => p.status === "featured"));
        }
    }, [activeTab, pages]);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la página "${title}"?`)) {
            try {
                await deleteDoc(doc(db, "pages", id));
                setPages(pages.filter(p => p.id !== id));
            } catch (error) {
                console.error("Error deleting page:", error);
                alert("Error al eliminar la página");
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
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Páginas</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Institucionales y fijas</p>
                </div>

                <Link href="/admin/pages/new" className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform" />
                    Nueva
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-sm group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar páginas..."
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    setFilteredPages(pages.filter(p =>
                                        p.title.toLowerCase().includes(val) ||
                                        p.slug?.toLowerCase().includes(val)
                                    ));
                                }}
                                className="w-full bg-gray-50 border border-transparent rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                            />
                        </div>
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
                    {loading ? (
                        <div className="p-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Cargando...</div>
                    ) : filteredPages.length === 0 ? (
                        <div className="p-16 text-center space-y-3">
                            <FileText className="w-8 h-8 text-gray-100 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-gray-300">Vacío</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Página</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Estado</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredPages.map((page) => {
                                    const statusInfo = getStatusInfo(page.status);
                                    return (
                                        <tr key={page.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-tight">{page.title}</p>
                                                        <code className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">/{page.slug}</code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${statusInfo.textColor}`}>{statusInfo.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <Link href={`/${page.slug}`} target="_blank" title="Ver" className="p-1.5 hover:bg-primary/5 rounded-md transition-colors group/icon">
                                                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover/icon:text-primary" />
                                                    </Link>
                                                    <Link href={`/admin/pages/edit/${page.id}`} title="Editar" className="p-1.5 hover:bg-primary/5 rounded-md transition-colors group/icon">
                                                        <Edit className="w-3.5 h-3.5 text-gray-400 group-hover/icon:text-primary" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(page.id, page.title)}
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
                    )}
                </div>
            </div>
        </div>
    );
}
