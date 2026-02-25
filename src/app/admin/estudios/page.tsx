"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { BookOpen, Plus, Search, Filter, Edit, Trash2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AdminEstudiosPage() {
    const [estudios, setEstudios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchEstudios() {
        try {
            setLoading(true);
            const q = query(collection(db, "estudios"), orderBy("updatedAt", "desc"), limit(20));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEstudios(fetched);
        } catch (error) {
            console.error("Error fetching estudios:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEstudios();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el estudio "${title}"?`)) {
            try {
                await deleteDoc(doc(db, "estudios", id));
                setEstudios(estudios.filter(e => e.id !== id));
            } catch (error) {
                console.error("Error deleting estudio:", error);
                alert("Error al eliminar el estudio");
            }
        }
    };

    return (
        <div className="p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Estudios</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Colecciones curadas de artículos</p>
                </div>

                <Link href="/admin/estudios/new" className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Nuevo Estudio
                </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar estudios..."
                                className="w-full bg-gray-50 border-2 border-transparent rounded-xl pl-12 pr-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 text-center text-xs font-black uppercase tracking-[0.2em] text-gray-300">Cargando estudios...</div>
                    ) : estudios.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <BookOpen className="w-12 h-12 text-gray-100 mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest text-gray-300">No hay estudios creados</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Estudio</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Artículos</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Última Modificación</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {estudios.map((estudio) => (
                                    <tr key={estudio.id} className="group hover:bg-gray-50/80 transition-all duration-300">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center space-x-6">
                                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                    <Image src={estudio.imageUrl || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800"} alt={estudio.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-black uppercase tracking-tight line-clamp-2 max-w-sm mb-1">{estudio.title}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest line-clamp-1">{estudio.excerpt}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-primary/5">
                                                {estudio.articleIds?.length || 0} ITEMS
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                {estudio.updatedAt?.toDate ? estudio.updatedAt.toDate().toLocaleDateString() : "Reciente"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Link href={`/admin/estudios/edit/${estudio.id}`} className="p-2.5 hover:bg-primary/5 rounded-xl transition-colors group/icon">
                                                    <Edit className="w-4 h-4 text-gray-400 group-hover/icon:text-primary" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(estudio.id, estudio.title)}
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
