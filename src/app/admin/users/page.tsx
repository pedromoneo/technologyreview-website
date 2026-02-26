"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { User, ShieldCheck, Mail, Plus, Trash2, Search, Loader2, X } from "lucide-react";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [adding, setAdding] = useState(false);

    async function fetchUsers() {
        try {
            setLoading(true);
            const q = query(collection(db, "authorized_users"));
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(fetched);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes("@")) return;

        setAdding(true);
        try {
            await addDoc(collection(db, "authorized_users"), {
                email: newEmail.toLowerCase().trim(),
                role: "Editor",
                status: "Activo",
                addedAt: serverTimestamp()
            });
            setNewEmail("");
            setShowAddModal(false);
            fetchUsers();
        } catch (error) {
            console.error("Error adding user:", error);
            alert("Error al añadir usuario");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (window.confirm(`¿Estás seguro de que quieres quitar el acceso a ${email}?`)) {
            try {
                await deleteDoc(doc(db, "authorized_users", id));
                setUsers(users.filter(u => u.id !== id));
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Error al eliminar usuario");
            }
        }
    };

    return (
        <div className="p-8 pb-16 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Usuarios</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Acceso administrativo</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 group"
                    >
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Añadir Usuario
                    </button>
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xs font-black uppercase tracking-widest text-primary">Añadir Nuevo Acceso</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-primary">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-accent">Email de Google</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="nombre@gmail.com"
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                                />
                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">El usuario debe usar este email para loguearse con Gmail.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={adding || !newEmail}
                                className="w-full bg-primary text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                            >
                                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Añadir Acceso"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xs font-black italic tracking-tighter uppercase text-primary">Equipo Autorizado</h2>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">{users.length} Miembros</span>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Cargando equipo...</div>
                    ) : (
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
                                    <tr key={u.id} className="group hover:bg-gray-50/80 transition-colors">
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
                                                <span className="text-[9px] font-black uppercase tracking-widest">{u.role || "Editor"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(u.id, u.email)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="p-6 bg-accent/5 rounded-xl border border-accent/20">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-primary flex-shrink-0">
                        <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Seguridad</h3>
                        <p className="text-[10px] text-gray-500 font-medium">El acceso administrativo se gestiona por lista blanca de emails. Solo podrán entrar usuarios con Gmail que estén en la lista superior.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
