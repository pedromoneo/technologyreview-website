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
        <div className="p-12 space-y-12 max-w-4xl">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Ajustes</h1>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Configuración global del sistema</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg transition-all active:scale-95 ${success ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-accent hover:text-primary"
                        }`}
                >
                    {success ? (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Guardado
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Guardando..." : "Guardar Cambios"}
                        </>
                    )}
                </button>
            </header>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 space-y-10">
                <section className="space-y-6">
                    <div className="flex items-center space-x-3 text-accent mb-2">
                        <Layers className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Categorías de Contenido (Temas)</span>
                    </div>

                    <p className="text-sm text-gray-400 font-medium max-w-xl">
                        Define la lista de categorías disponibles para clasificar los artículos y estudios. Estas aparecerán en los menús desplegables del editor.
                    </p>

                    <div className="flex flex-wrap gap-3 py-4">
                        {loading ? (
                            <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">Cargando...</div>
                        ) : categories.map(cat => (
                            <div key={cat} className="flex items-center bg-gray-50 border border-gray-100 rounded-xl pl-5 pr-2 py-2 group">
                                <span className="text-xs font-black uppercase tracking-widest text-primary">{cat}</span>
                                <button
                                    onClick={() => removeCategory(cat)}
                                    className="ml-3 p-1.5 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddCategory} className="flex gap-4">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Añadir nueva categoría..."
                            className="flex-1 bg-gray-50 border-2 border-transparent rounded-xl px-6 py-3.5 text-xs font-black uppercase tracking-widest outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            className="bg-white border-2 border-gray-100 text-primary px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:border-accent hover:text-accent transition-all flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
