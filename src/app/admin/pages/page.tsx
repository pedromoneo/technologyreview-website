"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { FileText, Plus, Search, Edit, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminPagesPage() {
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
        } catch (error) {
            console.error("Error fetching pages:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPages();
    }, []);

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

    return (
        <div className="p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Páginas Estáticas</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Gestiona páginas institucionales y de contenido fijo</p>
                </div>

                <Link href="/admin/pages/new" className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Nueva Página
                </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center text-xs font-black uppercase tracking-[0.2em] text-gray-300">Cargando páginas...</div>
                    ) : pages.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <FileText className="w-12 h-12 text-gray-100 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-gray-300">No hay páginas creadas</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Página</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Slug</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Actualización</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pages.map((page) => (
                                    <tr key={page.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tight">{page.title}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">{page.subtitle}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <code className="bg-gray-50 text-[10px] font-bold text-primary px-3 py-1.5 rounded-lg border border-gray-100">
                                                /{page.slug}
                                            </code>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                {page.updatedAt?.toDate ? page.updatedAt.toDate().toLocaleDateString() : "Reciente"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link href={`/${page.slug}`} target="_blank" className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <Link href={`/admin/pages/edit/${page.id}`} className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                    <Edit className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(page.id, page.title)}
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
                    )}
                </div>
            </div>
        </div>
    );
}
