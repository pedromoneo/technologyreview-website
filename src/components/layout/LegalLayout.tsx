import React from "react";

interface LegalLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export default function LegalLayout({ title, subtitle, children }: LegalLayoutProps) {
    return (
        <article className="min-h-screen bg-white">
            <header className="pt-40 pb-20 border-b bg-gray-50">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-primary leading-none">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xl md:text-2xl font-bold text-gray-400 mt-6 max-w-3xl mx-auto uppercase tracking-tight">
                            {subtitle}
                        </p>
                    )}
                </div>
            </header>

            <main className="container mx-auto px-6 py-20 max-w-4xl">
                <div className="article-content max-w-none">
                    {children}
                </div>
            </main>
        </article>
    );
}
