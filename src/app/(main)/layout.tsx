import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getCategories, getFeaturedInformes } from "@/lib/data-cache";

export const revalidate = 600;

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [topics, featuredInformes] = await Promise.all([
        getCategories(),
        getFeaturedInformes(),
    ]);

    return (
        <>
            <Navbar topics={topics} featuredInformes={featuredInformes} />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer />
        </>
    );
}
