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
    // ONLY apply simple paragraph wrapping if it looks like plain text or has very few tags
    const hasTags = /<[a-z][\s\S]*>/i.test(cleaned);

    if (!hasTags) {
        return cleaned
            .split(/\n{1,}/)
            .filter(p => p.trim().length > 0)
            .map(p => `<p class="mb-8 last:mb-0 leading-relaxed">${p.trim()}</p>`)
            .join('');
    }

    // If it has tags, we want to maintain them. 
    // BUT we still want to clean up excessive newlines that might cause gaps.
    // Instead of raw replacement, we'll just trim and clean whitespace
    cleaned = cleaned
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/\s*rn\s*/g, ' ') // Clean up any leftover rn
        .trim();

    return cleaned;
}

export function slugify(str: string): string {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, "-")           // Replace spaces with -
        .replace(/[^\w-]/g, "")          // Remove all non-word chars
        .replace(/--+/g, "-")           // Replace multiple - with single -
        .trim();                        // Trim from both sides
}
