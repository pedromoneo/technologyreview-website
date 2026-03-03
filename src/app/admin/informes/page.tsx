"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { BookOpen, Plus, Search, Filter, Edit, Trash2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminInformesPage() {
    const [informes, setInformes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchInformes() {
        try {
            setLoading(true);
            const q = query(collection(db, "informes"), orderBy("updatedAt", "desc"), limit(20));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInformes(fetched);
        } catch (error) {
            console.error("Error fetching informes:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchInformes();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el informe "${title}"?`)) {
            try {
                await deleteDoc(doc(db, "informes", id));
                setInformes(informes.filter(e => e.id !== id));
            } catch (error) {
                console.error("Error deleting informe:", error);
                alert("Error al eliminar el informe");
            }
        }
    };

    return (
        <div className="p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Informes</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Colecciones curadas de artículos</p>
                </div>

                <Link href="/admin/informes/new" className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Nuevo Informe
                </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar informes..."
                                className="w-full bg-gray-50 border-2 border-transparent rounded-xl pl-12 pr-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center text-xs font-black uppercase tracking-[0.2em] text-gray-300">Cargando informes...</div>
                    ) : informes.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <BookOpen className="w-12 h-12 text-gray-100 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-gray-300">No hay informes creados</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Informe</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Artículos</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Estado</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Última Modificación</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {informes.map((informe) => (
                                    <tr key={informe.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center space-x-6">
                                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <Image src={informe.imageUrl || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"} alt={informe.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-black uppercase tracking-tight line-clamp-2 max-w-sm mb-1">{informe.title}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">{informe.excerpt}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-primary/5">
                                                {informe.articleIds?.length || 0} ITEMS
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full border ${informe.status === 'featured' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    informe.status === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        'bg-gray-100 text-gray-400 border-gray-200'
                                                }`}>
                                                {informe.status === 'featured' ? '★ Destacado' :
                                                    informe.status === 'published' ? 'Publicado' :
                                                        'Borrador'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                {informe.updatedAt?.toDate ? informe.updatedAt.toDate().toLocaleDateString() : "Reciente"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link href={`/admin/informes/edit/${informe.id}`} className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                    <Edit className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(informe.id, informe.title)}
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
