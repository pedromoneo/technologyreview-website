"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, getCountFromServer, Timestamp } from "firebase/firestore";
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
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [articles, setArticles] = useState<any[]>([]);
    const [totalArticles, setTotalArticles] = useState(0);
    const [totalSubscribers, setTotalSubscribers] = useState(0);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);

                // Fetch recent articles for the table
                const articlesQ = query(collection(db, "articles"), orderBy("date", "desc"), limit(5));
                const articlesSnap = await getDocs(articlesQ);
                const fetchedArticles = articlesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setArticles(fetchedArticles);

                // Fetch counts
                const articlesCountSnap = await getCountFromServer(collection(db, "articles"));
                setTotalArticles(articlesCountSnap.data().count);

                const subscribersCountSnap = await getCountFromServer(collection(db, "subscribers"));
                setTotalSubscribers(subscribersCountSnap.data().count);

                // Fetch recent activity (recently updated articles/pages)
                // We'll look for updatedAt or migratedAt
                const activityQ = query(collection(db, "articles"), orderBy("updatedAt", "desc"), limit(4));
                const activitySnap = await getDocs(activityQ);
                const activities = activitySnap.docs.map(doc => {
                    const data = doc.data();
                    const timestamp = data.updatedAt || data.migratedAt;
                    let timeStr = "Recientemente";

                    if (timestamp) {
                        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
                        const diffInHours = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60));
                        if (diffInHours < 1) timeStr = "Hace menos de 1h";
                        else if (diffInHours < 24) timeStr = `Hace ${diffInHours}h`;
                        else timeStr = `Hace ${Math.floor(diffInHours / 24)}d`;
                    }

                    return {
                        user: data.author || "Sistema",
                        action: "actualizó artículo",
                        title: data.title,
                        time: timeStr
                    };
                });
                setRecentActivity(activities);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            router.push(`/admin/posts?search=${encodeURIComponent(searchTerm.trim())}`);
        }
    };

    const stats = [
        { label: "Visitas Totales", value: "128.4k", change: "+14%", trend: "up", icon: Eye },
        { label: "Artículos", value: totalArticles.toLocaleString(), change: "+2", trend: "up", icon: FileText },
        { label: "Suscriptores", value: totalSubscribers.toLocaleString(), change: "+5", trend: "up", icon: Users },
        { label: "Conversión", value: "3.2%", change: "+0.4%", trend: "up", icon: TrendingUp },
    ];

    return (
        <div className="p-8 pb-16 space-y-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Dashboard</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Bienvenido, {user?.email?.split('@')[0]}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent transition-all w-48 shadow-sm"
                        />
                    </div>
                    <Link href="/admin/posts/new" className="bg-primary text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Nuevo
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-accent/10 transition-colors">
                                <stat.icon className="w-4 h-4 text-primary group-hover:text-accent transition-colors" />
                            </div>
                            <div className={`flex items-center space-x-1 py-0.5 px-2 rounded-full text-[8px] font-black tracking-widest ${stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                } border ${stat.trend === 'up' ? 'border-emerald-100' : 'border-rose-100'}`}>
                                {stat.trend === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                <span>{stat.change}</span>
                            </div>
                        </div>
                        <h3 className="text-gray-400 font-black uppercase tracking-widest text-[8px] mb-0.5">{stat.label}</h3>
                        <p className="text-xl font-black italic tracking-tighter text-primary">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Articles Table */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-black italic tracking-tighter uppercase text-primary">Recientes</h2>
                        <Link href="/admin/posts" className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline">Ver todos</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Contenido</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Tema</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Estado</th>
                                    <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-6 py-4 h-16 bg-gray-50/30"></td>
                                        </tr>
                                    ))
                                ) : articles.map((article) => (
                                    <tr key={article.id} className="group hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-gray-100">
                                                    <Image src={article.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800"} alt={article.title} fill className="object-cover" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] font-black uppercase tracking-tight truncate max-w-[200px]">{article.title}</p>
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{article.author}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                                {article.category || "General"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center space-x-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${article.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${article.status === 'published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {article.status === 'published' ? 'Publicado' : article.status === 'featured' ? 'Destacado' : 'Borrador'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <Link href={`/admin/posts/edit/${article.id}`} className="text-[8px] font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">Editar</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions / Activity */}
                <div className="bg-primary rounded-xl shadow-lg p-6 text-white relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 -skew-x-12 transform translate-x-1/2 -translate-y-1/2" />
                    <h2 className="text-sm font-black italic tracking-tighter uppercase mb-6 relative z-10">Actividad</h2>
                    <div className="space-y-4 relative z-10 flex-1">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex-shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-2 bg-white/5 rounded w-3/4"></div>
                                        <div className="h-1 bg-white/5 rounded w-1/4"></div>
                                    </div>
                                </div>
                            ))
                        ) : recentActivity.length > 0 ? (
                            recentActivity.map((activity, i) => (
                                <div key={i} className="flex gap-3 group">
                                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-primary transition-all">
                                        <span className="font-black text-[9px]">{activity.user[0]}</span>
                                    </div>
                                    <div className="pt-0.5">
                                        <p className="text-[9px] font-bold leading-tight">
                                            <span className="text-accent group-hover:text-white transition-colors">{activity.user}</span> {activity.action}
                                        </p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-0.5 truncate max-w-[150px]">{activity.title}</p>
                                        <p className="text-[7px] font-black uppercase tracking-widest text-white/30">{activity.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest text-center py-8">No hay actividad reciente</p>
                        )}
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
                        <Link href="/admin/settings" className="w-full bg-white text-primary px-4 py-2 border border-blue-500 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-accent transition-colors text-center block">Soporte</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
