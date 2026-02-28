"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, Save, Search, X, GripVertical, Loader2, Plus, LayoutTemplate, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface CollectionFormProps {
    collectionId?: string;
}

export default function CollectionForm({ collectionId }: CollectionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedArticles, setSelectedArticles] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        sectionTitle: "", // "EXPLAINERS" or "MIT TECHNOLOGY REVIEW EXPLICA"
        title: "",        // Large bold title
        subtitle: "",
        color: "#00BCB4", // Default teal from technologyreview.com
        insertionPoint: "footer", // pos1, pos2, footer
    });

    const PRESET_COLORS = [
        { name: "Teal", value: "#00BCB4" },
        { name: "Orange", value: "#FF5E3A" },
        { name: "Blue", value: "#2D7FF9" },
        { name: "Indigo", value: "#4F46E5" },
        { name: "Gray", value: "#374151" },
    ];

    const INSERTION_POINTS = [
        { id: "pos1", label: "Tras 4 artículos (2 filas)" },
        { id: "pos2", label: "Tras 12 artículos (6 filas)" },
        { id: "footer", label: "Al final (sobre el footer)" },
    ];

    useEffect(() => {
        if (!collectionId) return;

        const fetchCollection = async () => {
            try {
                const docRef = doc(db, "collections", collectionId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        sectionTitle: data.sectionTitle || "",
                        title: data.title || "",
                        subtitle: data.subtitle || "",
                        color: data.color || "#00BCB4",
                        insertionPoint: data.insertionPoint || "footer",
                    });

                    // Fetch the full article objects for the selected IDs
                    if (data.articleIds && data.articleIds.length > 0) {
                        const articles = [];
                        for (const id of data.articleIds) {
                            const artDoc = await getDoc(doc(db, "articles", id));
                            if (artDoc.exists()) {
                                articles.push({ id: artDoc.id, ...artDoc.data() });
                            }
                        }
                        setSelectedArticles(articles);
                    }
                }
            } catch (error) {
                console.error("Error fetching collection:", error);
            }
        };
        fetchCollection();
    }, [collectionId]);

    const handleSearch = async () => {
        if (searchQuery.length < 3) return;
        setSearching(true);
        try {
            const q = query(collection(db, "articles"), orderBy("date", "desc"), limit(50));
            const snapshot = await getDocs(q);
            const allArticles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = allArticles.filter((a: any) =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error("Error searching articles:", error);
        } finally {
            setSearching(false);
        }
    };

    const addArticle = (article: any) => {
        if (!selectedArticles.find(a => a.id === article.id)) {
            setSelectedArticles([...selectedArticles, article]);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const removeArticle = (id: string) => {
        setSelectedArticles(selectedArticles.filter(a => a.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedArticles.length === 0) {
            alert("Selecciona al menos un artículo");
            return;
        }

        setLoading(true);
        const data = {
            ...formData,
            articleIds: selectedArticles.map(a => a.id),
            updatedAt: serverTimestamp(),
            createdAt: collectionId ? undefined : serverTimestamp(),
        };

        try {
            if (collectionId) {
                await updateDoc(doc(db, "collections", collectionId), data);
            } else {
                await addDoc(collection(db, "collections"), data);
            }
            router.push("/admin/collections");
        } catch (error) {
            console.error("Error saving collection:", error);
            alert("Error al guardar la colección");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Link href="/admin/collections" className="flex items-center text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Volver a Colecciones
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    {loading ? "..." : "Guardar Colección"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Config */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Título Super-sección</label>
                                <input
                                    type="text"
                                    value={formData.sectionTitle}
                                    onChange={(e) => setFormData({ ...formData, sectionTitle: e.target.value })}
                                    placeholder="EXPLAINERS"
                                    className="w-full bg-gray-50 rounded-lg px-4 py-2 text-[11px] font-bold outline-none border border-transparent focus:border-accent transition-all"
                                />
                                <p className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Aparece en pequeño sobre el título principal</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Título Principal</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="MIT Technology Review Explica"
                                    className="w-full bg-gray-50 rounded-lg px-4 py-2 text-[11px] font-bold outline-none border border-transparent focus:border-accent transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Subtítulo</label>
                                <textarea
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    placeholder="Profundizamos en los temas que importan..."
                                    className="w-full bg-gray-50 rounded-lg px-4 py-2 text-[11px] font-medium outline-none border border-transparent focus:border-accent transition-all min-h-[80px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Punto de Inserción
                                </label>
                                <div className="space-y-2">
                                    {INSERTION_POINTS.map((point) => (
                                        <button
                                            key={point.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, insertionPoint: point.id })}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${formData.insertionPoint === point.id
                                                ? "bg-primary text-white border-primary shadow-md scale-[1.02]"
                                                : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                                                }`}
                                        >
                                            {point.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Color de la Colección</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c.value })}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === c.value ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-105"}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="bg-gray-50 rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-gray-100 w-24"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Articles */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block text-center">Seleccionar Artículos</label>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                    placeholder="Buscar por título..."
                                    className="w-full bg-gray-50 rounded-xl pl-12 pr-4 py-3 text-[12px] font-bold outline-none border border-transparent focus:border-accent focus:bg-white transition-all shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-accent"
                                    >
                                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute z-10 mt-2 w-[512px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-[300px] overflow-y-auto">
                                    {searchResults.map((article) => (
                                        <button
                                            key={article.id}
                                            type="button"
                                            onClick={() => addArticle(article)}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none text-left group"
                                        >
                                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0 relative">
                                                <Image src={article.imageUrl || ""} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-[10px] font-black uppercase tracking-tight truncate group-hover:text-primary transition-colors">{article.title}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{article.category} • {article.date}</p>
                                            </div>
                                            <Plus className="w-4 h-4 text-gray-300 group-hover:text-accent" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center">
                                Artículos Seleccionados
                                <span className="ml-2 px-1.5 py-0.5 bg-primary/10 rounded-full text-[8px] italic">{selectedArticles.length}</span>
                            </h3>

                            <div className="space-y-2">
                                {selectedArticles.length > 0 ? (
                                    selectedArticles.map((article, index) => (
                                        <div
                                            key={article.id}
                                            className="flex items-center gap-4 bg-gray-50 border border-gray-100 rounded-xl p-3 group hover:border-accent/30 transition-all"
                                        >
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative shadow-sm">
                                                <Image src={article.imageUrl || ""} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black uppercase tracking-tight truncate">{article.title}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{article.category} • {article.date}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeArticle(article.id)}
                                                className="p-2 hover:bg-rose-50 rounded-lg text-gray-300 hover:text-rose-500 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                            <LayoutTemplate className="w-5 h-5 text-gray-200" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">No hay artículos seleccionados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
