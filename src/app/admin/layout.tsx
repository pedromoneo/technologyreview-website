"use client";

import { AuthWrapper } from "./AuthWrapper";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { useState } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <AuthWrapper>
            <div className="min-h-screen bg-gray-50 flex relative">
                <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
                <main className={`flex-1 transition-all duration-300 min-h-screen bg-gray-50 ${isCollapsed ? "md:ml-20" : "md:ml-64"}`}>
                    {children}
                </main>
            </div>
        </AuthWrapper>
    );
}
