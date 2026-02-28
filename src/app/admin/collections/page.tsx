"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { Plus, Edit, Trash2, LayoutTemplate, MapPin } from "lucide-react";
import Link from "next/link";

export default function AdminCollectionsPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const INSERTION_POINTS: Record<string, string> = {
        "pos1": "Tras 4 art.",
        "pos2": "Tras 12 art.",
        "footer": "Final"
    };

    async function fetchCollections() {
        try {
            setLoading(true);
            const q = query(collection(db, "collections"), orderBy("createdAt", "desc"), limit(50));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCollections(fetched);
        } catch (error) {
            console.error("Error fetching collections:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la colección "${title}"?`)) {
            try {
                await deleteDoc(doc(db, "collections", id));
                setCollections(collections.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error deleting collection:", error);
                alert("Error al eliminar la colección");
            }
        }
    };

    return (
        <div className="p-8 pb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Colecciones</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Curated Article Collections</p>
                </div>

                <Link href="/admin/collections/new" className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform" />
                    Nueva Colección
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Colección</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Posición</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Artículos</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-400 tracking-widest">Color</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-20">
                                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : collections.length > 0 ? (
                                collections.map((coll) => (
                                    <tr key={coll.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: coll.color + '20' }}>
                                                    <LayoutTemplate className="w-5 h-5" style={{ color: coll.color }} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-tight">
                                                        {coll.sectionTitle && <span className="text-[7px] text-gray-400 block -mb-0.5">{coll.sectionTitle}</span>}
                                                        {coll.title}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-gray-400 truncate max-w-xs uppercase tracking-widest mt-0.5">{coll.subtitle}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                <MapPin className="w-3 h-3 text-primary/40" />
                                                {INSERTION_POINTS[coll.insertionPoint] || "Final"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black italic tracking-tighter text-primary">
                                                {coll.articleIds?.length || 0} Artículos
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: coll.color }}></div>
                                                <span className="text-[9px] font-bold text-gray-400 tabular-nums uppercase">{coll.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Link href={`/admin/collections/edit/${coll.id}`} title="Editar" className="p-2 hover:bg-primary/5 rounded-md transition-colors group/icon">
                                                    <Edit className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(coll.id, coll.title)}
                                                    title="Eliminar"
                                                    className="p-2 hover:bg-rose-50 rounded-md transition-colors group/icon"
                                                >
                                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover/icon:text-rose-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No hay colecciones creadas</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
