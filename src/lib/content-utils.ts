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

/**
 * Truncate a string to a maximum length without cutting in the middle of a sentence if possible.
 */
export function truncateToSentence(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;

    // We want to find the last '.', '!', or '?' before maxLength
    const sub = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
        sub.lastIndexOf(". "),
        sub.lastIndexOf("! "),
        sub.lastIndexOf("? ")
    );

    if (lastSentenceEnd > maxLength * 0.4) { // Only truncate if we have a reasonable amount left
        return text.substring(0, lastSentenceEnd + 1);
    }

    // Fallback: just cut at maxLength and add ...
    return text.substring(0, maxLength).trim() + "...";
}

export function cleanContent(content: string): string {
    if (!content) return "";

    // 1. Initial cleanup of literal tokens
    let cleaned = content
        .replace(/rnrnrn/g, '\n\n')
        .replace(/rnrn/g, '\n\n')
        .replace(/rn/g, '\n')
        .replace(/\\r\\n|\\n|\r\n/g, '\n')
        .replace(/\\_/g, ' ')
        // Fix words stuck together by newline artifacts
        // If a newline is between a lowercase letter and another lowercase letter, it's likely a mistake.
        .replace(/([a-z])\n([a-z])/g, '$1 $2')
        // But if it's after a period and before a capital, it's a paragraph.
        .replace(/([.!?])\n([A-ZÁÉÍÓÚ])/g, '$1\n\n$2');

    // 2. Standardize some common artifacts
    cleaned = cleaned.replace(/n<(p|h|ul|ol|div|blockquote|section|figure|img)/gi, '\n<$1');

    // 3. Handle Unicode
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    // 4. Recover paragraph structure
    // If it has NO <p> tags at all, we MUST wrap it.
    const hasParagraphs = /<p[\s\S]*?>/i.test(cleaned);

    if (!hasParagraphs) {
        // Blocks that should NOT be wrapped in <p>
        const blockElements = /^\s*<(h[1-6]|figure|blockquote|ul|ol|li|div|section|article|img|iframe|table|hr)/i;

        const paragraphs = cleaned
            .split(/\n{2,}/)
            .filter(p => p.trim().length > 0);

        if (paragraphs.length > 0) {
            return paragraphs
                .map(p => {
                    const trimmed = p.trim();
                    // If it matches a block element at the start, don't wrap in <p>
                    if (blockElements.test(trimmed)) return trimmed;
                    // Otherwise wrap in <p>
                    return `<p class="mb-8 last:mb-0 leading-relaxed">${trimmed}</p>`;
                })
                .join('');
        }
    }

    // 5. Cleanup excessive white space
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
