import PostEditor from "@/components/admin/PostEditor";

export default function NewPostPage() {
    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Nuevo Artículo</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Crea una nueva historia para el mundo</p>
            </header>

            <PostEditor />
        </div>
    );
}
