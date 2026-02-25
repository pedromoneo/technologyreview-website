"use client";

import Link from "next/link";
import { Search, User, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const [topics, setTopics] = useState<string[]>([]);
    const [isTemasOpen, setIsTemasOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/temas/busqueda?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
            setSearchQuery("");
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);

        // Fetch categories from settings
        const fetchCategories = async () => {
            try {
                const docRef = doc(db, "settings", "categories");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTopics(docSnap.data().list || []);
                } else {
                    setTopics(["Inteligencia Artificial", "Biotecnología", "Energía", "Espacio", "Sostenibilidad", "Negocios"]);
                }
            } catch (error) {
                console.error("Error fetching categories for navbar:", error);
            }
        };
        fetchCategories();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg h-20" : "bg-white h-28"
                } border-b border-gray-100`}>
                <div className="container mx-auto px-6 h-full">
                    <div className="grid grid-cols-3 items-center h-full">
                        {/* Left: Logo */}
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center">
                                <div className={`relative transition-all duration-500 ${isScrolled ? "h-8 w-48 md:w-56" : "h-10 md:h-12 w-64 md:w-80"}`}>
                                    <Image
                                        src="/logo.png"
                                        alt="MIT Technology Review"
                                        fill
                                        className="object-contain object-left"
                                        priority
                                    />
                                </div>
                            </Link>
                        </div>

                        {/* Middle: Navigation Items */}
                        <div className="flex justify-center items-center h-full">
                            <div className="hidden lg:flex items-center space-x-12 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <div
                                    className="relative group h-full flex items-center"
                                    onMouseEnter={() => setIsTemasOpen(true)}
                                    onMouseLeave={() => setIsTemasOpen(false)}
                                >
                                    <Link href="/temas" className="hover:text-primary transition-colors flex items-center py-2">
                                        Temas
                                        <ChevronDown className={`w-3 h-3 ml-2 transition-transform duration-300 ${isTemasOpen ? "rotate-180" : ""}`} />
                                    </Link>

                                    {/* Dropdown Menu */}
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl py-6 transition-all duration-300 ${isTemasOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-4"}`}>
                                        <div className="grid grid-cols-1 gap-1 px-4">
                                            {topics.map(topic => (
                                                <Link
                                                    key={topic}
                                                    href={`/temas/${topic.toLowerCase().replace(/\s/g, "-")}`}
                                                    className="px-4 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-primary block font-black uppercase tracking-widest text-[10px]"
                                                >
                                                    {topic}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Link href="/temas/informes" className="hover:text-primary transition-colors">Informes</Link>
                                <Link href="/temas/eventos" className="hover:text-primary transition-colors">Eventos</Link>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center justify-end space-x-6">
                            <Link href="/suscribirse" className="hidden sm:block bg-accent text-primary text-[10px] font-black px-6 py-2.5 uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                                Suscríbete
                            </Link>
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors order-last"
                                aria-label="Buscar"
                            >
                                <Search className="w-5 h-5 text-primary" />
                            </button>
                            <Link href="/admin" className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Admin">
                                <User className="w-5 h-5 text-gray-400 hover:text-primary transition-colors" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Search Overlay */}
            <div className={`fixed inset-0 z-[100] bg-primary transition-all duration-500 ${isSearchOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
                <div className="container mx-auto px-6 h-full flex flex-col pt-32">
                    <button
                        onClick={() => setIsSearchOpen(false)}
                        className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-10 h-10" />
                    </button>

                    <form onSubmit={handleSearch} className="max-w-4xl mx-auto w-full">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent mb-12">Buscar en MIT Technology Review</h2>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Escribe para buscar..."
                                className="w-full bg-transparent border-b-2 border-white/20 text-4xl md:text-6xl font-black text-white py-8 outline-none focus:border-accent transition-colors placeholder:text-white/10 italic"
                                autoFocus={isSearchOpen}
                            />
                            <button type="submit" className="absolute right-0 bottom-8 text-accent hover:text-white transition-colors">
                                <Search className="w-10 h-10 md:w-16 md:h-16" />
                            </button>
                        </div>
                        <div className="mt-16">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">Temas populares</p>
                            <div className="flex flex-wrap gap-4">
                                {["Inteligencia Artificial", "Biotecnología", "Energía", "Espacio", "Sostenibilidad"].map(topic => (
                                    <button
                                        key={topic}
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery(topic);
                                            router.push(`/temas/${topic.toLowerCase().replace(/\s/g, "-")}`);
                                            setIsSearchOpen(false);
                                        }}
                                        className="text-xs font-black uppercase tracking-widest text-white border border-white/20 px-6 py-3 hover:bg-white hover:text-primary transition-all"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
