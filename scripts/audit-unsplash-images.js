/**
 * audit-unsplash-images.js
 *
 * Read-only audit: counts articles with Unsplash/missing images
 * and breaks them down by source, recency, and content status.
 *
 * Usage: node scripts/audit-unsplash-images.js
 */

const admin = require("firebase-admin");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const serviceAccountKey = process.env.ADMIN_SDK_KEY;
if (serviceAccountKey) {
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, "base64").toString("utf-8"));
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
} else {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();

const UNSPLASH_DEFAULT = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e";

function isUnsplashOrMissing(imageUrl) {
    if (!imageUrl) return true;
    if (typeof imageUrl !== "string") return false;
    return imageUrl.includes("images.unsplash.com");
}

function hasContent(content) {
    if (!content) return false;
    if (typeof content !== "string") return false;
    // Strip HTML tags and check if there's meaningful text (>50 chars)
    const text = content.replace(/<[^>]*>/g, "").trim();
    return text.length > 50;
}

function getTimestampDate(field) {
    if (!field) return null;
    // Firestore Timestamp
    if (field._seconds !== undefined) return new Date(field._seconds * 1000);
    if (field.toDate) return field.toDate();
    // String date
    if (typeof field === "string") return new Date(field);
    return null;
}

async function main() {
    console.log("=== Unsplash/Missing Image Audit ===\n");

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let totalArticles = 0;
    let totalUnsplash = 0;
    let unsplashMitTrUs = 0;
    let unsplashLegacy = 0;
    let unsplashLast2Years = 0;
    let unsplashLast1Year = 0;
    let unsplashWithContent = 0;
    let unsplashNoContent = 0;
    let unsplashMitTrUsWithImage = 0; // MIT TR US articles that have a non-unsplash image
    let totalMitTrUs = 0;

    // Also track non-unsplash articles for context
    let totalWithRealImage = 0;

    // Paginate through all articles
    const PAGE_SIZE = 500;
    let lastDoc = null;
    let page = 0;

    while (true) {
        let query = db.collection("articles").orderBy("__name__").limit(PAGE_SIZE);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        page++;
        console.log(`  Processing page ${page} (${snapshot.size} docs)...`);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            totalArticles++;

            const isMitTrUs = data.source === "MIT TR US";
            if (isMitTrUs) totalMitTrUs++;

            if (isUnsplashOrMissing(data.imageUrl)) {
                totalUnsplash++;

                if (isMitTrUs) {
                    unsplashMitTrUs++;
                } else {
                    unsplashLegacy++;
                }

                // Check recency using publishedAt or date field
                const pubDate = getTimestampDate(data.publishedAt) || getTimestampDate(data.date);
                if (pubDate) {
                    if (pubDate >= twoYearsAgo) unsplashLast2Years++;
                    if (pubDate >= oneYearAgo) unsplashLast1Year++;
                }

                // Check content
                if (hasContent(data.content)) {
                    unsplashWithContent++;
                } else {
                    unsplashNoContent++;
                }
            } else {
                totalWithRealImage++;
                if (isMitTrUs) unsplashMitTrUsWithImage++;
            }
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    console.log("\n========================================");
    console.log("          RESULTS SUMMARY");
    console.log("========================================\n");

    console.log(`Total articles in Firestore:            ${totalArticles}`);
    console.log(`Articles with real images:              ${totalWithRealImage}`);
    console.log(`Articles with Unsplash/missing images:  ${totalUnsplash}`);
    console.log();

    console.log("--- Breakdown by source ---");
    console.log(`  MIT TR US articles (total):            ${totalMitTrUs}`);
    console.log(`  MIT TR US with Unsplash/missing:       ${unsplashMitTrUs}`);
    console.log(`  MIT TR US with real images:             ${unsplashMitTrUsWithImage}`);
    console.log(`  Legacy (non-MIT) with Unsplash/missing: ${unsplashLegacy}`);
    console.log();

    console.log("--- Recency (among Unsplash/missing) ---");
    console.log(`  Published in last 2 years:             ${unsplashLast2Years}`);
    console.log(`  Published in last 1 year:              ${unsplashLast1Year}`);
    console.log();

    console.log("--- Content status (among Unsplash/missing) ---");
    console.log(`  With meaningful content (>50 chars):   ${unsplashWithContent}`);
    console.log(`  Empty or minimal content:              ${unsplashNoContent}`);
    console.log();

    const needGenerated = unsplashLegacy;
    const recentNeedGenerated = unsplashLast2Years - unsplashMitTrUs; // rough estimate
    console.log("========================================");
    console.log("          CONCLUSIONS");
    console.log("========================================");
    console.log(`\nArticles that genuinely need generated images:`);
    console.log(`  Total legacy articles needing images:  ${needGenerated}`);
    console.log(`  MIT TR US needing images (will self-fix on next sync or have none from API): ${unsplashMitTrUs}`);
    console.log();
    console.log(`No analytics integration found in the codebase.`);
    console.log(`Recency is the best proxy for traffic relevance.\n`);

    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
