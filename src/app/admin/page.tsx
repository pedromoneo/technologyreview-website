"use client";

import { useState } from "react";
import { Plus, LayoutDashboard, FileText, Settings, LogOut, BarChart } from "lucide-react";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("content");

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-primary text-white flex flex-col">
                <div className="p-8">
                    <h1 className="text-xl font-black italic tracking-tighter">TR CMS</h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <button className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setActiveTab('dashboard')}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                    </button>
                    <button className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'content' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setActiveTab('content')}>
                        <FileText className="w-4 h-4" />
                        <span>Contenido</span>
                    </button>
                    <button className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setActiveTab('stats')}>
                        <BarChart className="w-4 h-4" />
                        <span>Estadísticas</span>
                    </button>
                    <button className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setActiveTab('settings')}>
                        <Settings className="w-4 h-4" />
                        <span>Ajustes</span>
                    </button>
                </nav>

                <div className="p-4 mt-auto">
                    <button className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-bold text-white/50 hover:text-white transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white border-b px-8 py-6 flex items-center justify-between">
                    <h2 className="text-xl font-black text-primary uppercase tracking-widest">Gestión de Contenido</h2>
                    <button className="bg-accent text-primary px-6 py-2.5 font-black text-xs uppercase tracking-widest flex items-center hover:bg-white border border-accent transition-all active:scale-95">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Artículo
                    </button>
                </header>

                <div className="p-8">
                    <div className="bg-white border rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Título</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Categoría</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Autor</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Estado</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[
                                    { title: "Inteligencia Artificial y el futuro...", cat: "IA", author: "Redacción MIT", date: "24 Feb 2026", status: "Publicado" },
                                    { title: "Computación cuántica: Los hitos...", cat: "Computación", author: "Elena García", date: "22 Feb 2026", status: "Publicado" },
                                    { title: "Biotecnología: La edición genética...", cat: "Biotecnología", author: "Roberto Sanz", date: "20 Feb 2026", status: "Borrador" },
                                ].map((post, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-sm">{post.title}</td>
                                        <td className="px-6 py-4 text-xs font-black uppercase tracking-widest text-primary/60">{post.cat}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{post.author}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{post.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${post.status === 'Publicado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {post.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
