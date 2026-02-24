import { AuthWrapper } from "./AuthWrapper";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthWrapper>
            <div className="min-h-screen bg-gray-50 flex">
                <AdminSidebar />
                <main className="flex-1 ml-72 min-h-screen bg-gray-50">
                    {children}
                </main>
            </div>
        </AuthWrapper>
    );
}
