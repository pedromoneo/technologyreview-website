"use client";

import Link from "next/link";
import { Search, Menu, User } from "lucide-react";
import Image from "next/image";
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
                            {["Temas", "Informes", "Eventos"].map((item) => (
                                <Link key={item} href="#" className="hover:text-primary transition-colors cursor-default">
                                    {item}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Actions */}
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
