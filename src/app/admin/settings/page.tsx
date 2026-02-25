"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Settings as SettingsIcon, Layers, Plus, X, Save, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "categories");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCategories(docSnap.data().list || []);
                } else {
                    // Default categories if none exist
                    const defaults = ["Inteligencia Artificial", "Biotecnología", "Energía", "Espacio", "Sostenibilidad", "Negocios"];
                    setCategories(defaults);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory("");
        }
    };

    const removeCategory = (cat: string) => {
        setCategories(categories.filter(c => c !== cat));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "categories"), {
                list: categories,
                updatedAt: serverTimestamp()
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving categories:", error);
            alert("Error al guardar las categorías");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-8 pb-16 space-y-8 max-w-4xl">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-primary uppercase">Ajustes</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mt-1">Configuración global</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md transition-all active:scale-95 ${success ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-accent hover:text-primary"
                        }`}
                >
                    {success ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                            Guardado
                        </>
                    ) : (
                        <>
                            <Save className="w-3.5 h-3.5 mr-2" />
                            {saving ? "..." : "Guardar"}
                        </>
                    )}
                </button>
            </header>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-8">
                <section className="space-y-4">
                    <div className="flex items-center space-x-2 text-accent">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Categorías de Contenido</span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-medium max-w-xl">
                        Define los temas disponibles para clasificar los artículos y estudios en el sistema.
                    </p>

                    <div className="flex flex-wrap gap-2 py-2">
                        {loading ? (
                            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Cargando...</div>
                        ) : categories.map(cat => (
                            <div key={cat} className="flex items-center bg-gray-50 border border-gray-100 rounded-lg pl-3 pr-1 py-1 group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{cat}</span>
                                <button
                                    onClick={() => removeCategory(cat)}
                                    className="ml-2 p-1 hover:bg-rose-50 rounded text-gray-300 hover:text-rose-500 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddCategory} className="flex gap-2 pt-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nueva categoría..."
                            className="flex-1 bg-gray-50 border border-transparent rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            className="bg-white border border-gray-200 text-primary px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:border-accent hover:text-accent transition-all flex items-center"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Añadir
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
