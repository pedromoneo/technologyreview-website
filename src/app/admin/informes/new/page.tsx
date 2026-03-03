import InformesEditor from "@/components/admin/InformesEditor";

export default function NewInformePage() {
    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Crear Informe</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Crea una nueva colección curada de artículos</p>
            </header>

            <InformesEditor />
        </div>
    );
}
