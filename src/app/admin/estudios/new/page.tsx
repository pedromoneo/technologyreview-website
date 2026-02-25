import EstudiosEditor from "@/components/admin/EstudiosEditor";

export default function NewEstudioPage() {
    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Crear Estudio</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Crea una nueva colección curada de artículos</p>
            </header>

            <EstudiosEditor />
        </div>
    );
}
