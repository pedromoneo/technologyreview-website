import InformesEditor from "@/components/admin/InformesEditor";
import { use } from "react";

export default function EditInformePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Editar Informe</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Modifica la colección curada y su contenido</p>
            </header>

            <InformesEditor informeId={id} />
        </div>
    );
}
