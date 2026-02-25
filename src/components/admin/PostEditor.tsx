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
    }, [postId, categories.length]);

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
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Link href="/admin/posts" className="flex items-center text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                    Artículos
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    {loading ? "..." : "Guardar"}
                </button>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 space-y-8">
                {/* Title and Excerpt */}
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-accent">
                        <Type className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Contenido</span>
                    </div>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Título del artículo"
                        className="w-full text-2xl md:text-3xl font-black tracking-tighter outline-none placeholder:text-gray-100 border-b border-transparent focus:border-accent pb-2 transition-all"
                        required
                    />
                    <textarea
                        name="excerpt"
                        value={formData.excerpt}
                        onChange={handleChange}
                        placeholder="Breve resumen informativo..."
                        className="w-full text-lg text-gray-400 font-medium leading-normal outline-none min-h-[80px] resize-none border-l-2 border-gray-50 pl-4 focus:border-accent transition-all"
                        required
                    />
                </div>

                {/* Main Image URL */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-accent">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Imagen</span>
                    </div>
                    <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-gray-50 rounded-lg px-4 py-2 text-[11px] font-medium outline-none border border-transparent focus:border-accent focus:bg-white transition-all shadow-inner"
                    />
                </div>

                {/* Body Content */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-accent">
                        <Layout className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Cuerpo</span>
                    </div>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <WysiwygEditor
                            value={formData.content}
                            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                            placeholder="Empieza a escribir..."
                        />
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-accent">
                            <Tag className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Tags</span>
                        </div>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
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
                            placeholder="ia, futuro, apps..."
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-accent">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Autor</span>
                        </div>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            className="w-full bg-gray-50 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-accent">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Detalles</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full bg-gray-50 rounded-lg px-2 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                            />
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                    type="text"
                                    name="readingTime"
                                    value={formData.readingTime}
                                    onChange={handleChange}
                                    className="w-full bg-gray-50 rounded-lg pl-8 pr-2 py-2 text-[10px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
