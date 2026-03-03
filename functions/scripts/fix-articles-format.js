/**
 * Migration Script: Fix Article Formatting (Paragraphs & rnrn)
 * This script iterates through all articles and re-cleans their content using updated cleanContent logic.
 */
const admin = require("firebase-admin");

// Initialize Firestore
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "techreview-mgz-1771952"
    });
}
const db = admin.firestore();

/**
 * cleanContent logic ported from src/lib/content-utils.ts
 */
function cleanContent(content) {
    if (!content) return "";

    // 1. Initial cleanup of literal tokens
    let cleaned = content
        .replace(/rnrnrn/g, '\n\n')
        .replace(/rnrn/g, '\n\n')
        .replace(/rn/g, '\n')
        .replace(/\\r\\n|\\n|\r\n/g, '\n')
        .replace(/\\_/g, ' ')
        // Fix words stuck together by newline artifacts
        .replace(/([a-z])\n([a-z])/g, '$1 $2')
        // Paragraph detection
        .replace(/([.!?])\n([A-ZÁÉÍÓÚ])/g, '$1\n\n$2');

    // 2. Standardize some common artifacts
    cleaned = cleaned.replace(/n<(p|h|ul|ol|div|blockquote|section|figure|img)/gi, '\n<$1');

    // 3. Handle Unicode
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    // 4. Recover paragraph structure
    const hasParagraphs = /<p[\s\S]*?>/i.test(cleaned);

    if (!hasParagraphs) {
        const blockElements = /^\s*<(h[1-6]|figure|blockquote|ul|ol|li|div|section|article|img|iframe|table|hr)/i;

        const paragraphs = cleaned
            .split(/\n{2,}/)
            .filter(p => p.trim().length > 0);

        if (paragraphs.length > 0) {
            return paragraphs
                .map(p => {
                    const trimmed = p.trim();
                    if (blockElements.test(trimmed)) return trimmed;
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

async function runMigration() {
    console.log("Starting Article Formatting Migration...");
    const articlesRef = db.collection("articles");

    let processedCount = 0;
    let updatedCount = 0;
    let lastDoc = null;
    const PAGE_SIZE = 500;

    while (true) {
        let query = articlesRef.orderBy("__name__").limit(PAGE_SIZE);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        const batch = db.batch();
        let batchCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const originalContent = data.content || "";
            const cleaned = cleanContent(originalContent);

            if (cleaned !== originalContent) {
                batch.update(doc.ref, { content: cleaned });
                batchCount++;
                updatedCount++;
            }
            processedCount++;
            lastDoc = doc;
        });

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`Progress: Processed ${processedCount} articles, Updated ${updatedCount}...`);

        if (snapshot.docs.length < PAGE_SIZE) break;
    }

    console.log(`\nMigration complete!`);
    console.log(`Total processed: ${processedCount}`);
    console.log(`Total updated:   ${updatedCount}`);
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
