"use client";

import Link from "next/link";
import { Search, Menu, User } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-white/95 backdrop-blur-md shadow-lg h-20" : "bg-white h-28"
            } border-b border-gray-100`}>
            <div className="container mx-auto px-6 h-full">
                <div className="grid grid-cols-3 items-center h-full">
                    {/* Left Actions / Menu */}
                    <div className="flex items-center space-x-8">
                        <button className="flex items-center space-x-2 group">
                            <Menu className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                            <span className="hidden md:block text-[11px] font-black uppercase tracking-[0.2em]">Menú</span>
                        </button>

                        <div className="hidden lg:flex items-center space-x-6 text-[11px] font-black uppercase tracking-widest text-gray-400">
                            {["Temas", "Informes", "Eventos"].map((item) => (
                                <Link key={item} href={`/${item.toLowerCase()}`} className="hover:text-primary transition-colors">
                                    {item}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Centered Logo Section */}
                    <div className="flex flex-col items-center group cursor-pointer">
                        <Link href="/" className="flex flex-col items-center">
                            <h1 className={`font-black tracking-tighter text-primary transition-all duration-500 leading-none ${isScrolled ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"
                                }`}>
                                MIT <span className="text-gray-400 group-hover:text-primary transition-colors">Technology Review</span>
                            </h1>
                            <span className={`text-[9px] font-black text-gray-400 uppercase tracking-widest transition-all duration-500 overflow-hidden whitespace-nowrap ${isScrolled ? "max-h-0 opacity-0" : "max-h-5 opacity-100 mt-1.5"
                                }`}>
                                Publicado por <span className="text-primary">Opinno</span>
                            </span>
                        </Link>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center justify-end space-x-6">
                        <Link href="/suscribirse" className="hidden sm:block bg-accent text-primary text-[10px] font-black px-6 py-2.5 uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                            Suscríbete
                        </Link>
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors order-last">
                            <Search className="w-5 h-5 text-primary" />
                        </button>
                        <Link href="/admin" className="hidden md:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <User className="w-5 h-5 text-gray-400 hover:text-primary transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
