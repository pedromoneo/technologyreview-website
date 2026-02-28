"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, where } from "firebase/firestore";
import { Search, Trash2, User, Mail, Calendar, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminSubscribersPage() {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [filteredSubscribers, setFilteredSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    async function fetchSubscribers() {
        try {
            setLoading(true);
            const q = query(collection(db, "subscribers"), orderBy("createdAt", "desc"), limit(500));
            const snapshot = await getDocs(q);
            const fetchedSubscribers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSubscribers(fetchedSubscribers);
            setFilteredSubscribers(fetchedSubscribers);
        } catch (error) {
            console.error("Error fetching subscribers:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSubscribers();
    }, []);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        const result = subscribers.filter(s =>
            s.email?.toLowerCase().includes(term) ||
            s.displayName?.toLowerCase().includes(term)
        );
        setFilteredSubscribers(result);
        setCurrentPage(1);
    }, [searchTerm, subscribers]);

    const totalPages = Math.ceil(filteredSubscribers.length / pageSize);
    const currentSubscribers = filteredSubscribers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleDelete = async (id: string, email: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al suscriptor ${email}?`)) {
            try {
                await deleteDoc(doc(db, "subscribers", id));
                setSubscribers(subscribers.filter(s => s.id !== id));
            } catch (error) {
                console.error("Error deleting subscriber:", error);
                alert("Error al eliminar el suscriptor");
            }
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, "d MMM yyyy", { locale: es });
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, "HH:mm", { locale: es });
    };

    return (
        <div className="p-8 pb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Suscriptores</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Gestión de usuarios de la revista</p>
                </div>

                <div className="flex bg-accent/10 p-4 rounded-xl items-center gap-8 px-8">
                    <div className="text-center">
                        <p className="text-primary font-black text-xl leading-none">{subscribers.length}</p>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">Total</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="relative flex-1 max-w-sm group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-accent transition-colors" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O EMAIL..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Usuario</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Registro</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Último Acceso</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-20">
                                            <div className="h-4 bg-gray-100 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : currentSubscribers.length > 0 ? (
                                currentSubscribers.map((subscriber) => (
                                    <tr key={subscriber.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center text-primary font-black text-xs">
                                                    {subscriber.displayName?.[0] || subscriber.email?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black italic tracking-tight text-primary leading-tight">
                                                        {subscriber.displayName || "Sin nombre"}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 lowercase tracking-tight">
                                                        {subscriber.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="w-fit px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                    Activo
                                                </span>
                                                {subscriber.newsletterSubscribed && (
                                                    <span className="w-fit px-3 py-1 bg-primary/5 text-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/10">
                                                        Newsletter
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Calendar className="w-3 h-3 text-accent" />
                                                <span className="text-[10px] font-bold uppercase">{formatDate(subscriber.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-accent" />
                                                    <span className="text-[10px] font-bold uppercase">{formatDate(subscriber.lastLogin)}</span>
                                                </div>
                                                <span className="text-[9px] font-medium ml-5 text-gray-400">{formatTime(subscriber.lastLogin)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                                <button
                                                    onClick={() => handleDelete(subscriber.id, subscriber.email)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <User className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-300">No se encontraron suscriptores</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between font-black text-[9px] uppercase tracking-widest text-gray-400">
                        <span>Página {currentPage} de {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
