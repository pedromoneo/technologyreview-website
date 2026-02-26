const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Explicitly using gemini-2.5-flash as requested and verified available
const MODEL_NAME = "gemini-2.5-flash";

let model;
try {
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
    logger.info(`Gemini Model ${MODEL_NAME} initialized successfully.`);
} catch (e) {
    logger.error(`Error initializing Gemini model ${MODEL_NAME}:`, e);
}

setGlobalOptions({ maxInstances: 5, region: "us-central1" });

/**
 * Translates text into Spain Spanish using Gemini
 */
async function translateText(text) {
    if (!text || (typeof text === 'string' && text.trim() === "")) return text || "";

    const prompt = `Translate the following text into professional "Spain Spanish" (Español de España). 
  Important rules:
  1. Maintain a journalistic and sophisticated tone matching MIT Technology Review.
  2. Preserve all HTML tags, attributes, and structure exactly as they are.
  3. Do not translate technical terms if they are commonly used in English in the tech industry (e.g. "machine learning", "blockchain", "big data" unless there's a very standard Spanish equivalent).
  4. Return ONLY the translated text, no conversational fillers or explanations.

  Text to translate:
  ${text}`;

    try {
        logger.info(`[DEVOPS] Translating block with model: ${MODEL_NAME}`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let translated = response.text().trim();

        // Strip markdown code blocks if present
        if (translated.startsWith('```')) {
            translated = translated.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '').trim();
        }

        return translated;
    } catch (error) {
        logger.error("Gemini Translation error details:", error);
        // If it fails, we fall back to the original text
        return text || "";
    }
}

/**
 * Common logic to fetch, translate, and sync articles
 */
async function processEntry(entry) {
    const originalId = String(entry.id);
    logger.info(`Processing article: ${entry.title} (${originalId})`);

    // MIT API specific keys: 'dek' is excerpt (deck), 'body' is content
    const rawExcerpt = (entry.dek || "").replace(/<[^>]*>?/gm, "").trim();
    const rawBody = entry.body || [];

    // Translate Metadata
    const translatedTitle = await translateText(entry.title || "Sin título");
    const translatedExcerpt = await translateText(rawExcerpt);

    let fullHtmlContent = "";
    if (rawBody && Array.isArray(rawBody)) {
        for (const block of rawBody) {
            if (block.type === "html" && block.data) {
                const translatedBlock = await translateText(block.data);
                fullHtmlContent += (translatedBlock || "");
            } else if (block.type === "image" && block.data && block.data.url) {
                fullHtmlContent += `<figure class="my-8"><img src="${block.data.url}" alt="${block.data.alt || ""}" class="w-full rounded-xl" /><figcaption class="text-xs text-center text-gray-500 mt-2">${block.data.caption || ""}</figcaption></figure>`;
            }
        }
    }

    const category = (entry.topics && entry.topics.length > 0) ? entry.topics[0].name : "General";
    const tags = entry.topics ? entry.topics.map(t => t.name) : [];

    // Image Discovery logic
    let imageUrl = null;

    // 1. Try images array (usually most reliable)
    if (entry.images && Array.isArray(entry.images) && entry.images.length > 0) {
        // Try to find a good one, or just take the first
        const img = entry.images[0];
        if (img && img.url) {
            // Strip WP resizing parameters to get full image if possible
            imageUrl = img.url.split('?')[0];
        }
    }

    // 2. Fallback to topper
    if (!imageUrl && entry.topper && entry.topper.image && entry.topper.image.url) {
        imageUrl = entry.topper.image.url.split('?')[0];
    }

    // 3. Fallback to attachments
    if (!imageUrl && entry.attachments && entry.attachments.thumbnail && entry.attachments.thumbnail.url) {
        imageUrl = entry.attachments.thumbnail.url.split('?')[0];
    }

    const articleData = {
        title: translatedTitle || entry.title || "Sin título",
        excerpt: translatedExcerpt || rawExcerpt || "",
        content: fullHtmlContent.trim() || translatedExcerpt || rawExcerpt || "",
        category: category || "General",
        tags: tags || [],
        author: (entry.byline && entry.byline.length > 0) ? (entry.byline[0].text || "MIT Technology Review") : "MIT Technology Review",
        date: entry.published ? new Date(entry.published).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }),
        imageUrl: imageUrl || null,
        readingTime: `${entry.word_count ? Math.ceil(entry.word_count / 200) : 5} min`,
        status: "published",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalId: originalId,
        language: "es",
        source: "MIT TR US"
    };

    // Sanitize to avoid Firestore undefined errors
    Object.keys(articleData).forEach(key => {
        if (articleData[key] === undefined) {
            articleData[key] = null;
        }
    });

    return articleData;
}

/**
 * Common logic to fetch, translate, and sync articles
 */
async function performSync(limit = 5, offset = 0) {
    const db = admin.firestore();
    let syncedCount = 0;

    try {
        const apiUrl = `https://wp.technologyreview.com/wp-json/mittr/v1/entries?limit=${limit}&offset=${offset}&sort=recent`;
        logger.info(`Fetching articles from: ${apiUrl}`);
        const response = await axios.get(apiUrl);
        const entries = response.data.entries;

        if (!entries || !Array.isArray(entries)) {
            logger.info("No entries found in API response");
            return 0;
        }

        for (const entry of entries) {
            const originalId = String(entry.id);
            const articleData = await processEntry(entry);

            const existing = await db.collection("articles").where("originalId", "==", originalId).get();
            if (!existing.empty) {
                logger.info(`Article already exists, updating: ${articleData.title}`);
                // Use update to preserve other fields, or set with merge
                await existing.docs[0].ref.set(articleData, { merge: true });
            } else {
                logger.info(`Creating new article: ${articleData.title}`);
                await db.collection("articles").add(articleData);
            }
            syncedCount++;
        }
        return syncedCount;
    } catch (error) {
        logger.error("Sync error:", error);
        throw error;
    }
}

/**
 * Scheduled trigger
 */
exports.syncMITArticles = onSchedule({
    schedule: "0 8 * * *",
    timeZone: "Europe/Madrid",
}, async (event) => {
    await performSync();
});

/**
 * Manual trigger for debugging
 * Usage: https://.../manualSync?limit=5&offset=0
 */
exports.manualSync = onRequest({ maxInstances: 1, timeoutSeconds: 540 }, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const offset = parseInt(req.query.offset) || 0;

        logger.info(`Starting manual sync with limit=${limit}, offset=${offset}`);
        const count = await performSync(limit, offset);
        res.status(200).send(`Manual sync finished. Synced ${count} articles.`);
    } catch (error) {
        logger.error("Manual sync error", error);
        res.status(500).send(error.toString());
    }
});
