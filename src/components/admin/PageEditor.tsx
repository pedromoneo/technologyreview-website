"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Save, Image as ImageIcon, Type, Layout, FileText, AlignLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WysiwygEditor from "./WysiwygEditor";

interface PageEditorProps {
    pageId?: string;
}

export default function PageEditor({ pageId }: PageEditorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        subtitle: "",
        excerpt: "",
        content: "",
        featuredImageUrl: "",
        headerImageUrl: "",
        slug: "",
    });

    useEffect(() => {
        if (pageId) {
            const fetchPage = async () => {
                const docRef = doc(db, "pages", pageId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(docSnap.data() as any);
                }
            };
            fetchPage();
        }
    }, [pageId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Auto-generate slug from title if not manually edited
            slug: name === "title" && !pageId ? value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : prev.slug
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const pageData = {
            ...formData,
            updatedAt: serverTimestamp(),
            createdAt: pageId ? undefined : serverTimestamp(),
        };

        try {
            if (pageId) {
                await updateDoc(doc(db, "pages", pageId), pageData);
            } else {
                await addDoc(collection(db, "pages"), pageData);
            }
            router.push("/admin/pages");
        } catch (error) {
            console.error("Error saving page:", error);
            alert("Error al guardar la página");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-12">
            <div className="flex items-center justify-between">
                <Link href="/admin/pages" className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Páginas
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-xl shadow-primary/20 hover:bg-accent hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-3" />
                    {loading ? "Guardando..." : "Guardar Página"}
                </button>
            </div>

            <div className="space-y-8">
                {/* Visual Section: Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Imagen de Cabecera (Hero)</span>
                        </div>
                        <input
                            type="url"
                            name="headerImageUrl"
                            value={formData.headerImageUrl}
                            onChange={handleChange}
                            placeholder="URL imagen de cabecera"
                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs outline-none focus:bg-white border-2 border-transparent focus:border-accent transition-all"
                        />
                        {formData.headerImageUrl && (
                            <div className="relative aspect-video rounded-xl overflow-hidden">
                                <Image src={formData.headerImageUrl} alt="" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Imagen Destacada (Miniatura)</span>
                        </div>
                        <input
                            type="url"
                            name="featuredImageUrl"
                            value={formData.featuredImageUrl}
                            onChange={handleChange}
                            placeholder="URL imagen destacada"
                            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-xs outline-none focus:bg-white border-2 border-transparent focus:border-accent transition-all"
                        />
                        {formData.featuredImageUrl && (
                            <div className="relative aspect-video rounded-xl overflow-hidden">
                                <Image src={formData.featuredImageUrl} alt="" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <Type className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Títulos y SEO</span>
                        </div>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Título de la Página"
                            className="w-full text-4xl font-black tracking-tighter outline-none placeholder:text-gray-100 border-b-2 border-transparent focus:border-accent pb-4 transition-all"
                            required
                        />
                        <input
                            type="text"
                            name="subtitle"
                            value={formData.subtitle}
                            onChange={handleChange}
                            placeholder="Subtítulo"
                            className="w-full text-xl font-bold text-gray-400 outline-none border-b border-gray-50 pb-2"
                        />
                        <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg w-fit">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Slug:</span>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                className="bg-transparent text-[9px] font-black uppercase tracking-widest text-primary outline-none min-w-[200px]"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 text-accent mb-2">
                            <AlignLeft className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Resumen (Excerpt)</span>
                        </div>
                        <textarea
                            name="excerpt"
                            value={formData.excerpt}
                            onChange={handleChange}
                            placeholder="Breve descripción para meta-tags y compartidos..."
                            className="w-full bg-gray-50 rounded-2xl px-6 py-4 text-sm font-medium outline-none min-h-[100px] focus:bg-white border-2 border-transparent focus:border-accent transition-all"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-accent mb-2">
                            <div className="flex items-center space-x-3">
                                <FileText className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Contenido (HTML / WYSIWYG)</span>
                            </div>
                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Soporta etiquetas HTML</span>
                        </div>
                        <WysiwygEditor
                            value={formData.content}
                            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                            placeholder="Escribe el contenido de la página aquí..."
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
