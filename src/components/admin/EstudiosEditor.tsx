"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Save, Image as ImageIcon, Type, Search, Plus, Check, X, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Article {
    id: string;
    title: string;
    author: string;
    imageUrl: string;
}

interface EstudiosEditorProps {
    estudioId?: string;
}

export default function EstudiosEditor({ estudioId }: EstudiosEditorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingArticles, setFetchingArticles] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableArticles, setAvailableArticles] = useState<Article[]>([]);
    const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        excerpt: "",
        imageUrl: "",
    });

    // Fetch Estudio data if editing
    useEffect(() => {
        if (estudioId) {
            const fetchEstudio = async () => {
                const docRef = doc(db, "estudios", estudioId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        title: data.title || "",
                        excerpt: data.excerpt || "",
                        imageUrl: data.imageUrl || "",
                    });

                    // Fetch details of associated articles
                    if (data.articleIds && data.articleIds.length > 0) {
                        const articles: Article[] = [];
                        for (const id of data.articleIds) {
                            const artDoc = await getDoc(doc(db, "articles", id));
                            if (artDoc.exists()) {
                                articles.push({ id: artDoc.id, ...artDoc.data() } as Article);
                            }
                        }
                        setSelectedArticles(articles);
                    }
                }
            };
            fetchEstudio();
        }
    }, [estudioId]);

    // Search articles in Firestore
    const searchArticles = useCallback(async (qString: string) => {
        if (!qString.trim()) {
            setAvailableArticles([]);
            return;
        }

        setFetchingArticles(true);
        try {
            // Simplistic search: fetch latest samples and filter client-side
            // (Standard Firestore doesn't support full-text search without Algolia/Elastic)
            const q = query(collection(db, "articles"), orderBy("migratedAt", "desc"), limit(100));
            const snapshot = await getDocs(q);
            const filtered = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Article))
                .filter(art =>
                    art.title.toLowerCase().includes(qString.toLowerCase()) ||
                    art.author?.toLowerCase().includes(qString.toLowerCase())
                );
            setAvailableArticles(filtered);
        } catch (error) {
            console.error("Error searching articles:", error);
        } finally {
            setFetchingArticles(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleArticle = (article: Article) => {
        if (selectedArticles.some(a => a.id === article.id)) {
            setSelectedArticles(prev => prev.filter(a => a.id !== article.id));
        } else {
            setSelectedArticles(prev => [...prev, article]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const estudioData = {
            ...formData,
            articleIds: selectedArticles.map(a => a.id),
            updatedAt: serverTimestamp(),
            createdAt: estudioId ? undefined : serverTimestamp(),
        };

        try {
            if (estudioId) {
                await updateDoc(doc(db, "estudios", estudioId), estudioData);
            } else {
                await addDoc(collection(db, "estudios"), estudioData);
            }
            router.push("/admin/estudios");
        } catch (error) {
            console.error("Error saving estudio:", error);
            alert("Error al guardar el estudio");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <Link href="/admin/estudios" className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Estudios
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-xl shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-3" />
                    {loading ? "Guardando..." : "Guardar Estudio"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Metadata */}
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 space-y-10">
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <Type className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Información del Estudio</span>
                        </div>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Título del Estudio"
                            className="w-full text-4xl font-black tracking-tighter outline-none placeholder:text-gray-100 border-b-2 border-transparent focus:border-accent pb-4 transition-all"
                            required
                        />
                        <textarea
                            name="excerpt"
                            value={formData.excerpt}
                            onChange={handleChange}
                            placeholder="Breve descripción del estudio..."
                            className="w-full text-lg text-gray-400 font-medium leading-relaxed outline-none min-h-[120px] resize-none border-l-4 border-gray-50 pl-6 focus:border-accent transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Imagen de Portada</span>
                        </div>
                        <input
                            type="url"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            placeholder="URL de la imagen destacada"
                            className="w-full bg-gray-50 rounded-2xl px-6 py-4 text-sm font-medium outline-none border-2 border-transparent focus:border-accent focus:bg-white transition-all shadow-inner"
                        />
                        {formData.imageUrl && (
                            <div className="relative w-full h-48 rounded-2xl overflow-hidden mt-4">
                                <Image src={formData.imageUrl} alt="Vista previa" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Article Selection */}
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col h-[700px]">
                    <div className="flex items-center space-x-3 text-accent mb-6 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Seleccionar Artículos</span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6 flex-shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                searchArticles(e.target.value);
                            }}
                            placeholder="Buscar artículos por título..."
                            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
                        />
                    </div>

                    {/* Selection Area Split */}
                    <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 px-2">Resultados</p>
                            {fetchingArticles ? (
                                <div className="text-center py-4 text-xs font-bold text-gray-400">Buscando...</div>
                            ) : availableArticles.length > 0 ? (
                                availableArticles.map(article => {
                                    const isSelected = selectedArticles.some(a => a.id === article.id);
                                    return (
                                        <button
                                            key={article.id}
                                            type="button"
                                            onClick={() => toggleArticle(article)}
                                            className={`w-full flex items-center p-3 rounded-2xl transition-all border-2 ${isSelected ? "bg-accent/10 border-accent" : "bg-gray-50 border-transparent hover:border-gray-200"}`}
                                        >
                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image src={article.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=200"} alt="" fill className="object-cover" />
                                            </div>
                                            <div className="ml-4 text-left flex-1 min-w-0">
                                                <p className="text-xs font-black uppercase truncate">{article.title}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{article.author}</p>
                                            </div>
                                            {isSelected ? (
                                                <Check className="w-4 h-4 text-primary ml-2" />
                                            ) : (
                                                <Plus className="w-4 h-4 text-gray-300 ml-2" />
                                            )}
                                        </button>
                                    );
                                })
                            ) : searchQuery ? (
                                <div className="text-center py-4 text-xs font-bold text-gray-400">No se encontraron artículos</div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic">Escribe para empezar a buscar artículos</p>
                                </div>
                            )}
                        </div>

                        {/* Selected Articles */}
                        <div className="h-1/3 border-t border-gray-100 pt-4 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary px-2 mb-2 flex justify-between">
                                <span>Artículos Seleccionados ({selectedArticles.length})</span>
                                {selectedArticles.length > 0 && (
                                    <button type="button" onClick={() => setSelectedArticles([])} className="text-rose-500 hover:text-rose-600">Limpiar</button>
                                )}
                            </p>
                            {selectedArticles.map(article => (
                                <div key={article.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] font-bold uppercase truncate flex-1 pr-4">{article.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => toggleArticle(article)}
                                        className="p-1 hover:bg-rose-100 rounded-lg text-rose-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {selectedArticles.length === 0 && (
                                <p className="text-center py-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">No hay artículos seleccionados</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
