export function cleanContent(content: string): string {
    if (!content) return "";

    // 1. Normalize line endings and handle migration artifacts
    let cleaned = content
        .replace(/\r\n/g, '\n')
        .replace(/rnrn/g, '\n\n')
        .replace(/rn/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\_/g, ' ');

    // 2. Handle the "n<p" etc artifacts - these usually indicate a newline was meant
    cleaned = cleaned.replace(/n<(p|h|ul|ol|div|blockquote|section)/gi, '\n<$1');

    // 3. Handle unicode
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    // 4. Recover paragraph structure
    // If it's already mostly HTML, we just want to ensure the whitespace between tags is cleaned
    // But many imported articles have text BETWEEN or OUTSIDE tags without <p> wrappers.

    // First, split by existing block tags to identify "islands" of plain text
    const blockTags = /<(p|h[1-6]|ul|ol|li|blockquote|div|section|table|figure|hr)[^>]*>|<\/(p|h[1-6]|ul|ol|li|blockquote|div|section|table|figure|hr)>/gi;

    // If the content has NO block tags, wrap everything logically
    if (!blockTags.test(cleaned)) {
        return cleaned
            .split(/\n{1,}/)
            .filter(p => p.trim().length > 0)
            .map(p => `<p class="mb-8 last:mb-0 leading-relaxed">${p.trim()}</p>`)
            .join('');
    }

    // If it HAS tags, we need to be careful. 
    // A common issue in migrated content is "text\n<p>..." where 'text' isn't wrapped.
    // Let's use a simpler heuristic: if it looks like there are double newlines, treat them as paragraph breaks
    // but only outside of existing tags. This is hard with regex, so we'll do a "re-format" approach.

    // Replace double newlines with placeholders to preserve them
    cleaned = cleaned.replace(/\n\s*\n/g, '</p><p>');

    // Final cleanup: ensure we don't have empty paragraphs or double nested ones
    cleaned = cleaned
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p><p>/g, '<p>')
        .replace(/<\/p><\/p>/g, '</p>');

    return cleaned;
}
