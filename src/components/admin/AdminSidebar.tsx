"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    BookOpen,
    Layers,
    Users,
    Settings,
    LogOut,
    ExternalLink
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminSidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    const mainItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Artículos", href: "/admin/posts", icon: FileText },
        { label: "Estudios", href: "/admin/estudios", icon: BookOpen },
        { label: "Páginas", href: "/admin/pages", icon: Layers },
    ];

    const settingsItems = [
        { label: "Ajustes", href: "/admin/settings", icon: Settings },
        { label: "Usuarios", href: "/admin/users", icon: Users },
    ];

    const NavItem = ({ item }: { item: typeof mainItems[0] }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-4 px-6 py-4 rounded-xl transition-all duration-300 group ${isActive
                    ? "bg-accent text-primary shadow-lg shadow-accent/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:scale-110 transition-transform"}`} />
                <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
            </Link>
        );
    };

    return (
        <aside className="w-72 bg-primary text-white flex flex-col fixed h-full z-40">
            <div className="p-8 border-b border-white/5">
                <Link href="/admin" className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                        <span className="text-primary font-black italic text-xl">TR</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-black italic tracking-tighter leading-none">CMS</h2>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Panel de Control</span>
                    </div>
                </Link>
            </div>

            <div className="flex-1 flex flex-col justify-between py-8">
                <nav className="px-4 space-y-2">
                    <p className="px-6 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Principal</p>
                    {mainItems.map((item) => (
                        <NavItem key={item.href} item={item} />
                    ))}
                </nav>

                <nav className="px-4 space-y-2">
                    <p className="px-6 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Configuración</p>
                    {settingsItems.map((item) => (
                        <NavItem key={item.href} item={item} />
                    ))}

                    <div className="pt-8 mt-8 border-t border-white/5">
                        <Link
                            href="/"
                            target="_blank"
                            className="flex items-center space-x-4 px-6 py-4 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                        >
                            <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-black uppercase tracking-widest">Ver Sitio Web</span>
                        </Link>
                    </div>
                </nav>
            </div>

            <div className="p-6 mt-auto">
                <div className="p-6 bg-white/5 rounded-2xl flex items-center space-x-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-black uppercase tracking-tight truncate">{user?.email?.split('@')[0]}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Administrador</p>
                    </div>
                </div>
                <button
                    onClick={() => logout()}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}
