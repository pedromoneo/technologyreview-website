import CollectionForm from "@/components/admin/CollectionForm";

export default function NewCollectionPage() {
    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Nueva Colección</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Crea una colección temática de artículos</p>
            </header>

            <CollectionForm />
        </div>
    );
}
