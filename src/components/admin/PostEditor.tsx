"use client";

import { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, Save, Image as ImageIcon, Tag, Layout, Type, User, Calendar, Clock, Upload, Loader2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WysiwygEditor from "./WysiwygEditor";

interface PostEditorProps {
    postId?: string;
}

export default function PostEditor({ postId }: PostEditorProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        excerpt: "",
        content: "",
        category: "Tecnología",
        author: "Redacción",
        imageUrl: "",
        status: "draft",
        isFeaturedInHeader: false,
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
    }, []);

    useEffect(() => {
        if (!postId) return;

        const fetchPost = async () => {
            try {
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
                        status: data.status || "draft",
                        isFeaturedInHeader: data.isFeaturedInHeader || false,
                        date: data.date || new Date().toISOString().split("T")[0],
                        readingTime: data.readingTime || "5 min",
                        tags: (data.tags || []).join(", ")
                    });
                }
            } catch (error) {
                console.error("Error fetching article:", error);
            }
        };
        fetchPost();
    }, [postId, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `articles/${fileName}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
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
                    disabled={loading || uploading}
                    className="bg-primary text-white px-6 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center shadow-md shadow-primary/10 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    {loading ? "..." : "Guardar"}
                </button>
            </div>

            {/* Featured in Header Banner */}
            {formData.isFeaturedInHeader && (
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-primary">
                        <div className="bg-accent p-2 rounded-lg">
                            <Layout className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Destacado en Cabecera</p>
                            <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">Este artículo aparecerá en la posición principal de la home.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, isFeaturedInHeader: false }))}
                        className="text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-rose-500 transition-colors"
                    >
                        Quitar
                    </button>
                </div>
            )}

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

                {/* Main Image URL & Upload */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-accent">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Imagen Destacada</span>
                        </div>
                        {formData.imageUrl && (
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, imageUrl: "" }))}
                                className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center"
                            >
                                <X className="w-2.5 h-2.5 mr-1" />
                                Eliminar
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <div className="relative group">
                                <input
                                    type="url"
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={handleChange}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full bg-gray-50 rounded-lg px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-accent focus:bg-white transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Pega una URL o sube un archivo local</p>
                        </div>

                        <div className="flex-shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="h-[38px] px-6 bg-gray-50 border border-gray-100 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-3.5 h-3.5 mr-2" />
                                )}
                                {uploading ? "Subiendo..." : "Subir archivo"}
                            </button>
                        </div>
                    </div>

                    {formData.imageUrl && (
                        <div className="relative mt-4 w-full h-48 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 group">
                            <Image
                                src={formData.imageUrl}
                                alt="Preview"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                    )}
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
                            <span className="text-[9px] font-black uppercase tracking-widest">Estado y Tags</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-gray-50 rounded-lg px-2 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                            >
                                <option value="draft">Borrador</option>
                                <option value="published">Publicado</option>
                                <option value="featured">Destacado</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => setFormData(p => ({ ...p, isFeaturedInHeader: !p.isFeaturedInHeader }))}
                                className={`w-full rounded-lg px-2 py-2 text-[9px] font-black uppercase tracking-widest outline-none border transition-all flex items-center justify-center gap-2 ${formData.isFeaturedInHeader
                                    ? "bg-accent text-primary border-accent shadow-sm"
                                    : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                                    }`}
                            >
                                <Layout className="w-3 h-3" />
                                {formData.isFeaturedInHeader ? "En Portada" : "Poner en Portada"}
                            </button>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-gray-50 rounded-lg px-2 py-2 text-[9px] font-black uppercase tracking-widest outline-none border border-transparent focus:border-accent transition-all"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
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
