"use client";

import { useState } from "react";
import { User, ShieldCheck, Mail, Plus, Trash2, Search } from "lucide-react";

export default function UsersPage() {
    // Currently hardcoded based on auth-context.tsx ADMIN_EMAILS
    const [users] = useState([
        { email: "pedro.moneo@gmail.com", role: "Super Admin", status: "Activo" }
    ]);

    return (
        <div className="p-8 pb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Usuarios</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Acceso administrativo</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR..."
                            className="bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent transition-all w-48 shadow-sm"
                        />
                    </div>
                    <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group">
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Invitar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xs font-black italic tracking-tighter uppercase text-primary">Equipo Autorizado</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Usuario</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest">Rol</th>
                                <th className="px-6 py-3 text-[9px] font-black uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((u) => (
                                <tr key={u.email} className="group hover:bg-gray-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-black text-xs">
                                                {u.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-tight">{u.email.split('@')[0]}</p>
                                                <div className="flex items-center text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <Mail className="w-2.5 h-2.5 mr-1" />
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-primary">
                                            <ShieldCheck className="w-3.5 h-3.5 mr-2 text-accent" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{u.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-6 bg-accent/5 rounded-xl border border-accent/20">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-primary flex-shrink-0">
                        <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Seguridad</h3>
                        <p className="text-[10px] text-gray-500 font-medium">El acceso está restringido a emails específicos. Las invitaciones requieren configuración en Google Cloud.</p>
                    </div>
                    <button className="bg-primary text-white px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-accent hover:text-primary transition-all">
                        Documentación
                    </button>
                </div>
            </div>
        </div>
    );
}
