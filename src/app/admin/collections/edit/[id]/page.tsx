"use client";

import CollectionForm from "@/components/admin/CollectionForm";
import { useParams } from "next/navigation";

export default function EditCollectionPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Editar Colección</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Modifica los artículos y estilo de la colección</p>
            </header>

            <CollectionForm collectionId={id} />
        </div>
    );
}
