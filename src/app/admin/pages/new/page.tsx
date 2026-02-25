import PageEditor from "@/components/admin/PageEditor";

export default function NewPage() {
    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Crear Página</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Crea una nueva página estática para el sitio</p>
            </header>

            <PageEditor />
        </div>
    );
}
