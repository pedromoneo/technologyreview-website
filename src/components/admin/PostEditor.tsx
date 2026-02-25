"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Save, Image as ImageIcon, Tag, Layout, Type, User, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WysiwygEditor from "./WysiwygEditor";

interface PostEditorProps {
    postId?: string;
}

export default function PostEditor({ postId }: PostEditorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        excerpt: "",
        content: "",
        category: "Tecnología",
        author: "Redacción",
        imageUrl: "",
        date: new Date().toISOString().split("T")[0],
        readingTime: "5 min",
        tags: ""
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "categories");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCategories(docSnap.data().list || []);
                } else {
                    setCategories(["Tecnología", "IA", "Negocios"]);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchSettings();

        if (postId) {
            const fetchPost = async () => {
                const docRef = doc(db, "articles", postId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setFormData({
                        title: data.title || "",
                        excerpt: data.excerpt || "",
                        content: data.content || "",
                        category: data.category || (categories[0] || "Tecnología"),
                        author: data.author || "Redacción",
                        imageUrl: data.imageUrl || "",
                        date: data.date || new Date().toISOString().split("T")[0],
                        readingTime: data.readingTime || "5 min",
                        tags: (data.tags || []).join(", ")
                    });
                }
            };
            fetchPost();
        }
    }, [postId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const postData = {
            ...formData,
            tags: formData.tags.split(",").map(t => t.trim()).filter(t => t !== ""),
            updatedAt: serverTimestamp(),
            migratedAt: serverTimestamp(), // Keep this for sorting compatibility
        };

        try {
            if (postId) {
                await updateDoc(doc(db, "articles", postId), postData);
            } else {
                await addDoc(collection(db, "articles"), postData);
            }
            router.push("/admin/posts");
        } catch (error) {
            console.error("Error saving post:", error);
            alert("Error al guardar el artículo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <Link href="/admin/posts" className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a la lista
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-xl shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-3" />
                    {loading ? "Guardando..." : "Guardar Artículo"}
                </button>
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-gray-100 space-y-10">
                {/* Title and Excerpt */}
                <div className="space-y-6">
                    <div className="flex items-center space-x-3 text-accent mb-2">
                        <Type className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Contenido Principal</span>
                    </div>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Título del artículo"
                        className="w-full text-4xl md:text-5xl font-black tracking-tighter outline-none placeholder:text-gray-100 border-b-2 border-transparent focus:border-accent pb-4 transition-all"
                        required
                    />
                    <textarea
                        name="excerpt"
                        value={formData.excerpt}
                        onChange={handleChange}
                        placeholder="Resumen o bajada del artículo..."
                        className="w-full text-xl text-gray-400 font-medium leading-relaxed outline-none min-h-[100px] resize-none border-l-4 border-gray-50 pl-6 focus:border-accent transition-all"
                        required
                    />
                </div>

                {/* Main Image URL */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-accent mb-2">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Imagen Destacada</span>
                    </div>
                    <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        placeholder="URL de la imagen (Unsplash, etc.)"
                        className="w-full bg-gray-50 rounded-2xl px-8 py-4 text-sm font-medium outline-none border-2 border-transparent focus:border-accent focus:bg-white transition-all shadow-inner"
                    />
                </div>

                {/* Body Content */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-accent mb-2">
                        <Layout className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cuerpo del Artículo (Formato Enriquecido)</span>
                    </div>
                    <WysiwygEditor
                        value={formData.content}
                        onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                        placeholder="Escribe el contenido aquí..."
                    />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10 border-t border-gray-50">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-accent">
                            <Tag className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Categoría y Tags</span>
                        </div>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full bg-gray-50 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-accent transition-all tabular-nums"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="Tags (separados por coma)"
                            className="w-full bg-gray-50 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-accent transition-all"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-accent">
                            <User className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Autor</span>
                        </div>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            className="w-full bg-gray-50 rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-accent transition-all"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-accent">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Publicación</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full bg-gray-50 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-accent transition-all"
                            />
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                    type="text"
                                    name="readingTime"
                                    value={formData.readingTime}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 rounded-xl pl-10 pr-6 py-3 text-xs font-black uppercase tracking-widest outline-none border-2 border-transparent focus:border-accent transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
