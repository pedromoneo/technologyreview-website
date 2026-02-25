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
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Cargando...</div>
                    ) : pages.length === 0 ? (
                        <div className="p-16 text-center space-y-3">
                            <FileText className="w-8 h-8 text-gray-100 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-gray-300">Vacío</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Página</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Ruta</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pages.map((page) => (
                                    <tr key={page.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-tight">{page.title}</p>
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">{page.subtitle}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="bg-gray-50 text-[9px] font-bold text-primary px-2 py-1 rounded-md border border-gray-100">
                                                /{page.slug}
                                            </code>
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
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
