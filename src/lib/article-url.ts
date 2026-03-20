type ArticleLike = {
    id?: string;
    slug?: string | null;
    legacySlug?: string | null;
    legacyPath?: string | null;
};

export function getArticleSlug(article: ArticleLike) {
    return article.legacySlug || article.slug || null;
}

export function getArticlePath(article: ArticleLike) {
    // Always route to the canonical /article/[slug] path.
    // Never return /articulos/... because that is the legacy redirect
    // route and would cause an infinite redirect loop.
    const slug = getArticleSlug(article);
    if (slug) {
        return `/article/${slug}`;
    }

    return article.id ? `/article/${article.id}` : "/";
}
