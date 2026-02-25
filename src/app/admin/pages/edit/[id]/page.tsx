import PageEditor from "@/components/admin/PageEditor";
import { use } from "react";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Editar Página</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Modifica el contenido y configuración de la página</p>
            </header>

            <PageEditor pageId={id} />
        </div>
    );
}
