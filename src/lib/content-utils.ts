export function cleanExcerpt(excerpt: string): string {
    if (!excerpt) return "";

    // 1. Initial cleanup of artifacts and HTML
    let cleaned = excerpt
        .replace(/<[^>]*>?/gm, "") // Remove HTML tags
        .replace(/rnrnrn/g, " ")
        .replace(/rnrn/g, " ")
        .replace(/rn/g, " ")
        .replace(/\\r\\n|\\n|\r\n|\n/g, " ")
        .replace(/\\_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // 2. Logic to handle truncation: if it ends with "..." or has no sentence punctuation at the end
    // We want to find the last '.', '!', or '?' and cut there if the text seems truncated.
    const hasEllipsis = cleaned.endsWith("...");
    const lastChar = cleaned.slice(-1);
    const isPunctuation = [".", "!", "?", '”', '"'].includes(lastChar);

    if (hasEllipsis || !isPunctuation) {
        // Remove trailing dots first
        cleaned = cleaned.replace(/\.+\s*$/, "");

        // Find last sentence end
        const lastSentenceEnd = Math.max(
            cleaned.lastIndexOf("."),
            cleaned.lastIndexOf("!"),
            cleaned.lastIndexOf("?")
        );

        if (lastSentenceEnd > 20) { // Only trim if we have a reasonable amount of text left
            cleaned = cleaned.substring(0, lastSentenceEnd + 1);
        }
    }

    return cleaned.trim();
}

export function cleanContent(content: string): string {
    if (!content) return "";

    // 1. Normalize line endings and handle artifacts
    let cleaned = content
        // Handle literal "rnrn" and "rn" strings which are common migration artifacts
        .replace(/rnrnrn/g, '\n\n')
        .replace(/rnrn/g, '\n\n')
        .replace(/rn/g, '\n')
        // Standard escapes
        .replace(/\\r\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\_/g, ' ');

    // 2. Handle the "n<p" etc artifacts - these usually indicate a newline was meant
    cleaned = cleaned.replace(/n<(p|h|ul|ol|div|blockquote|section)/gi, '\n<$1');

    // 3. Handle specific formatting artifacts
    // Sometimes words are stuck together with "n" (e.g. "palabranpalabra")
    // but we only want to fix it if it's very likely a newline artifact
    // (e.g., between punctuation and a capital letter, which usually doesn't happen in Spanish)
    // Actually, it's safer to stick to obvious artifacts for now to avoid breaking words.

    // 4. Handle unicode
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    // 5. Recover paragraph structure
    // If it has NO <p> tags at all, we MUST wrap it.
    const hasParagraphs = /<p[\s\S]*?>/i.test(cleaned);
    const hasTags = /<[a-z][\s\S]*?>/i.test(cleaned);

    if (!hasParagraphs) {
        // It might have other tags, but no paragraphs. 
        // We'll split by newlines to create paragraphs.
        // We use {1,} here for splitting to be more aggressive in finding breaks if there are no <p> tags.
        const paragraphs = cleaned
            .split(/\n{2,}/)
            .filter(p => p.trim().length > 0);

        if (paragraphs.length > 0) {
            return paragraphs
                .map(p => {
                    const trimmed = p.trim();
                    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed; // Skip if looks like a tag block
                    return `<p class="mb-8 last:mb-0 leading-relaxed">${trimmed}</p>`;
                })
                .join('');
        }
    }

    // If it has tags, we want to maintain them. 
    // BUT we still want to clean up excessive newlines that might cause gaps.
    cleaned = cleaned
        .replace(/<p>\s*<\/p>/g, '')
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
