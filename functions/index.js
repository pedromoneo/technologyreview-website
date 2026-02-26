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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

/**
 * Translates text into Spain Spanish using Gemini
 */
async function translateText(text) {
    if (!text || text.trim() === "") return text;

    const prompt = `Translate the following text into professional "Spain Spanish" (Español de España). 
  Important rules:
  1. Maintain a journalistic and sophisticated tone matching MIT Technology Review.
  2. Preserve all HTML tags, attributes, and structure exactly as they are.
  3. Do not translate technical terms if they are commonly used in English in the tech industry (e.g. "machine learning", "blockchain", "big data" unless there's a very standard Spanish equivalent).
  4. Return ONLY the translated text, no conversational fillers or explanations.

  Text to translate:
  ${text}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        logger.error("Gemini Translation error", error);
        // If it fails, we fall back to the original text
        return text;
    }
}

/**
 * Common logic to fetch, translate, and sync articles
 */
async function performSync() {
    const db = admin.firestore();

    try {
        const response = await axios.get("https://wp.technologyreview.com/wp-json/mittr/v1/entries?limit=5&sort=recent");
        const entries = response.data.entries;

        if (!entries || !Array.isArray(entries)) {
            logger.info("No entries found in API response");
            return 0;
        }

        let count = 0;
        for (const entry of entries) {
            const originalId = String(entry.id);

            const existing = await db.collection("articles").where("originalId", "==", originalId).get();
            if (!existing.empty) continue;

            logger.info(`Processing new article: ${entry.title}`);

            // Translate Metadata
            const translatedTitle = await translateText(entry.title || "Sin título");
            const translatedExcerpt = await translateText(entry.excerpt || "");

            let fullHtmlContent = "";
            if (entry.content && Array.isArray(entry.content)) {
                for (const block of entry.content) {
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

            await db.collection("articles").add({
                title: translatedTitle || entry.title || "Sin título",
                excerpt: translatedExcerpt || entry.excerpt || "",
                content: fullHtmlContent.trim() || translatedExcerpt || entry.excerpt || "",
                category: category || "General",
                tags: tags || [],
                author: (entry.author && entry.author.length > 0) ? (entry.author[0].display_name || "MIT Technology Review") : "MIT Technology Review",
                date: entry.date ? new Date(entry.date).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }),
                imageUrl: (entry.featured_image && entry.featured_image.url) ? entry.featured_image.url : null,
                readingTime: `${entry.word_count ? Math.ceil(entry.word_count / 200) : 5} min`,
                status: "draft",
                migratedAt: admin.firestore.FieldValue.serverTimestamp(),
                originalId: originalId,
                language: "es",
                source: "MIT TR US"
            });

            logger.info(`Successfully synced: ${translatedTitle}`);
            count++;
        }
        return count;
    } catch (error) {
        logger.error("Error in sync logic", error);
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
