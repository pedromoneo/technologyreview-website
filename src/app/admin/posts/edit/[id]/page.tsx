import PostEditor from "@/components/admin/PostEditor";

interface EditPostPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
    const { id } = await params;

    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-black italic tracking-tighter text-primary uppercase">Editar Artículo</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Refina y actualiza tu contenido</p>
            </header>

            <PostEditor postId={id} />
        </div>
    );
}
