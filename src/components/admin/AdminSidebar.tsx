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
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    LayoutTemplate
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AdminSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function AdminSidebar({ isCollapsed, onToggle }: AdminSidebarProps) {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    const mainItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Artículos", href: "/admin/posts", icon: FileText },
        { label: "Colecciones", href: "/admin/collections", icon: LayoutTemplate },
        { label: "Estudios", href: "/admin/estudios", icon: BookOpen },
        { label: "Páginas", href: "/admin/pages", icon: Layers },
        { label: "Suscriptores", href: "/admin/subscribers", icon: Users },
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
                title={isCollapsed ? item.label : ""}
                className={`flex items-center ${isCollapsed ? "justify-center" : "space-x-3 px-4"} py-2.5 rounded-lg transition-all duration-200 group ${isActive
                    ? "bg-accent text-primary shadow-md shadow-accent/5"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
            >
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "group-hover:scale-110 transition-transform"}`} />
                {!isCollapsed && (
                    <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={onToggle}
                />
            )}

            {/* Toggle Button - Independent of Sidebar Translation on Mobile */}
            <button
                onClick={onToggle}
                className={`
                    fixed top-6 w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center 
                    shadow-2xl hover:scale-110 active:scale-95 transition-all z-[100] ring-4 ring-gray-50
                    ${isCollapsed
                        ? "left-4 md:left-[72px]"
                        : "left-[240px] md:left-[240px]"}
                `}
            >
                {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>

            <aside className={`
                ${isCollapsed ? "w-0 md:w-20 -translate-x-full md:translate-x-0" : "w-64 translate-x-0"} 
                bg-primary text-white flex flex-col fixed h-full z-50 transition-all duration-300 ease-in-out border-r border-white/5 shadow-2xl
            `}>

                <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar">

                    <div className={`p-6 border-b border-white/5 ${isCollapsed ? "flex justify-center" : ""}`}>
                        <Link href="/admin" className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center flex-shrink-0">
                                <span className="text-primary font-black italic text-base">TR</span>
                            </div>
                            {!isCollapsed && (
                                <div>
                                    <h2 className="text-sm font-black italic tracking-tighter leading-none">CMS</h2>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Panel</span>
                                </div>
                            )}
                        </Link>
                    </div>

                    <div className="flex-1 flex flex-col gap-8 py-6">
                        <nav className={`px-3 space-y-1 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                            {!isCollapsed && (
                                <p className="px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Principal</p>
                            )}
                            {mainItems.map((item) => (
                                <NavItem key={item.href} item={item} />
                            ))}
                        </nav>

                        <nav className={`px-3 space-y-1 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                            {!isCollapsed && (
                                <p className="px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Configuración</p>
                            )}
                            {settingsItems.map((item) => (
                                <NavItem key={item.href} item={item} />
                            ))}

                            <div className={`pt-4 mt-4 border-t border-white/5 ${isCollapsed ? "w-full flex justify-center" : ""}`}>
                                <Link
                                    href="/"
                                    target="_blank"
                                    title={isCollapsed ? "Ver Sitio Web" : ""}
                                    className={`flex items-center ${isCollapsed ? "justify-center" : "space-x-3 px-4"} py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all group`}
                                >
                                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {!isCollapsed && (
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Sitio Web</span>
                                    )}
                                </Link>
                            </div>
                        </nav>
                    </div>

                    <div className={`p-4 mt-auto border-t border-white/5 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                        {!isCollapsed ? (
                            <div className="p-3 bg-white/5 rounded-xl flex items-center space-x-3 mb-3 border border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-black text-xs">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase tracking-tight truncate">{user?.email?.split('@')[0]}</p>
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Adm.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-black text-xs mb-3">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                        )}
                        <button
                            onClick={() => logout()}
                            title={isCollapsed ? "Cerrar Sesión" : ""}
                            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3 px-4"} py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-400 transition-colors`}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {!isCollapsed && <span>Salir</span>}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
