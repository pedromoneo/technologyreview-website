"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import {
    Plus,
    TrendingUp,
    Users,
    FileText,
    Eye,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from "lucide-react";
import Image from "next/image";

export default function AdminDashboard() {
    const { user } = useAuth();
    const [articles, setArticles] = useState<any[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);

    useEffect(() => {
        async function fetchArticles() {
            try {
                const q = query(collection(db, "articles"), orderBy("migratedAt", "desc"), limit(5));
                const snapshot = await getDocs(q);
                const fetchedArticles = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setArticles(fetchedArticles);

                // For a real app, you would use separate aggregation queries for total counts.
                // Here we just mock the total or use a placeholder if needed.
                setTotalArticles(fetchedArticles.length > 0 ? 12582 : 0); // using the migration count
            } catch (error) {
                console.error("Error fetching articles:", error);
            }
        }
        fetchArticles();
    }, []);

    const stats = [
        { label: "Visitas Totales", value: "128.4k", change: "+14%", trend: "up", icon: Eye },
        { label: "Artículos", value: totalArticles.toString(), change: "+2", trend: "up", icon: FileText },
        { label: "Suscriptores", value: "4,291", change: "-2%", trend: "down", icon: Users },
        { label: "Conversión", value: "3.2%", change: "+0.4%", trend: "up", icon: TrendingUp },
    ];

    return (
        <div className="p-12 pb-24 space-y-12">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Panel de Control</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Bienvenido de nuevo, {user?.email?.split('@')[0]}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR ARTÍCULO..."
                            className="bg-white border-2 border-gray-100 rounded-xl pl-12 pr-6 py-3.5 text-xs font-black uppercase tracking-widest outline-none focus:border-accent transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                        <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                        Nuevo Artículo
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all duration-500">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-accent/10 transition-colors">
                                <stat.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                            </div>
                            <div className={`flex items-center space-x-1 py-1 px-3 rounded-full text-[10px] font-black tracking-widest ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{stat.change}</span>
                            </div>
                        </div>
                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-1">{stat.label}</h3>
                        <p className="text-3xl font-black italic tracking-tighter text-primary">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Articles Table */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-xl font-black italic tracking-tighter uppercase text-primary">Artículos Recientes</h2>
                        <button className="text-xs font-black uppercase tracking-widest text-accent hover:underline">Ver todos</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Artículo</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Estado</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {articles.map((article) => (
                                    <tr key={article.id} className="group hover:bg-gray-50/80 transition-colors">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                    <Image src={article.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"} alt={article.title} fill className="object-cover" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-black uppercase tracking-tight truncate max-w-xs">{article.title}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{article.author}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <span className="bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                                {article.category || "General"}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Publicado</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions / Activity */}
                <div className="bg-primary rounded-[2.5rem] shadow-xl p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 -skew-x-12 transform translate-x-1/2 -translate-y-1/2" />

                    <h2 className="text-xl font-black italic tracking-tighter uppercase mb-10 relative z-10">Actividad Reciente</h2>

                    <div className="space-y-8 relative z-10">
                        {[
                            { user: "Grace", action: "publicó nuevo artículo", time: "Hace 2h", type: "post" },
                            { user: "Sistema", action: "reforzó seguridad API", time: "Hace 5h", type: "system" },
                            { user: "Pedro", action: "editó ajustes de sitio", time: "Hace 14h", type: "edit" },
                            { user: "Michelle", action: "invitó a nuevo editor", time: "Hace 1d", type: "user" },
                        ].map((activity, i) => (
                            <div key={i} className="flex gap-4 group">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-primary transition-all">
                                    <span className="font-black text-xs">{activity.user[0]}</span>
                                </div>
                                <div className="pt-1">
                                    <p className="text-xs font-bold leading-relaxed">
                                        <span className="text-accent group-hover:text-white transition-colors">{activity.user}</span> {activity.action}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 pt-8 border-t border-white/10 relative z-10">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                            <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-3">Soporte Técnico</h4>
                            <p className="text-xs font-medium text-gray-400 mb-6">¿Necesitas ayuda con el editor de artículos?</p>
                            <button className="w-full bg-white text-primary px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-colors">Contactar Soporte</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
