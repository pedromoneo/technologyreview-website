const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Explicitly using gemini-2.5-flash as the latest standard version
const MODEL_NAME = "gemini-2.5-flash";
const TRANSLATION_SECRET_NAMES = ["GEMINI_API_KEY"];
const TRANSLATION_STATUS = {
    TRANSLATED: "translated",
    PENDING: "pending",
    FAILED: "failed",
};
const MAX_HTML_BLOCKS_PER_CHUNK = 3;
const MAX_CHARS_PER_TRANSLATION_CHUNK = 12000;

// Mapping from MIT TR API topic names (English) to site categories (Spanish)
const TOPIC_TO_CATEGORY_MAP = {
    "artificial intelligence": "Inteligencia Artificial",
    "biotechnology and health": "Biotecnología",
    "biotechnology": "Biotecnología",
    "climate change and energy": "Energía",
    "energy": "Energía",
    "climate": "Sostenibilidad",
    "climate change": "Sostenibilidad",
    "sustainability": "Sostenibilidad",
    "space": "Espacio",
    "computing": "Inteligencia Artificial",
    "business": "Negocios",
    "tech policy": "Negocios",
    "humans and technology": "Inteligencia Artificial",
    "the download": "General",
};

const SITE_CATEGORIES = [
    "Inteligencia Artificial",
    "Biotecnología",
    "Energía",
    "Espacio",
    "Sostenibilidad",
    "Negocios",
];

/**
 * Map an English API topic name to a Spanish site category
 */
function mapTopicToCategory(topicName) {
    if (!topicName) return "General";
    const key = topicName.toLowerCase().trim();
    return TOPIC_TO_CATEGORY_MAP[key] || "General";
}

let model;

setGlobalOptions({ maxInstances: 5, region: "us-central1" });

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGeminiApiKey() {
    return (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
}

function getModel() {
    if (model) return model;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY no configurada en Cloud Functions.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        requestOptions: { timeout: 300000 }
    });

    logger.info(`Gemini Model ${MODEL_NAME} initialized successfully.`);
    return model;
}

function stripCodeFences(text) {
    let cleaned = (text || "").trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```[a-z]*\n/i, "").replace(/\n```$/m, "").trim();
    }
    return cleaned;
}

function isRetryableGeminiError(error) {
    const message = `${error?.message || error}`.toLowerCase();
    return [
        "429",
        "500",
        "503",
        "deadline",
        "timeout",
        "resource exhausted",
        "quota",
        "unavailable",
        "internal"
    ].some((pattern) => message.includes(pattern));
}

async function callGemini(prompt, label, maxAttempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.info(`Gemini request started (${label})`, { attempt, model: MODEL_NAME });
            const result = await getModel().generateContent(prompt);
            const response = await result.response;
            return stripCodeFences(response.text());
        } catch (error) {
            lastError = error;
            logger.error(`Gemini request failed (${label})`, {
                attempt,
                message: error?.message || String(error),
            });

            if (attempt === maxAttempts || !isRetryableGeminiError(error)) {
                break;
            }

            await sleep(Math.min(10000, 1000 * (2 ** (attempt - 1))));
        }
    }

    throw lastError;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForComparison(text) {
    return String(text || "")
        .replace(/<[^>]*>?/gm, " ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function isMeaningfullyTranslated(original, translated) {
    const originalNormalized = normalizeForComparison(original);
    const translatedNormalized = normalizeForComparison(translated);

    if (!originalNormalized) return true;
    if (!translatedNormalized) return false;

    return originalNormalized !== translatedNormalized;
}

function makeMarker(label, side) {
    return `__${side}_${label}__`;
}

async function translateStructuredParts(parts, contextLabel) {
    const partsToTranslate = parts.filter((part) => part.text && part.text.trim());
    if (partsToTranslate.length === 0) return {};

    const serializedParts = partsToTranslate
        .map((part) => `${makeMarker(part.label, "START")}\n${part.text}\n${makeMarker(part.label, "END")}`)
        .join("\n\n");

    const prompt = `Translate each segment below into professional "Spain Spanish" (Español de España).
Important rules:
1. Preserve every HTML tag, attribute, URL and overall structure.
2. Keep journalistic tone consistent with MIT Technology Review.
3. Keep common English technical terms only when they are standard in Spanish tech coverage.
4. Do not add explanations or commentary.
5. Return every segment wrapped in exactly the same markers you received.

SEGMENTS:
${serializedParts}`;

    const responseText = await callGemini(prompt, contextLabel);
    const translations = {};

    for (const part of partsToTranslate) {
        const startMarker = makeMarker(part.label, "START");
        const endMarker = makeMarker(part.label, "END");
        const match = responseText.match(new RegExp(`${escapeRegExp(startMarker)}\\s*([\\s\\S]*?)\\s*${escapeRegExp(endMarker)}`));

        if (!match) {
            throw new Error(`No se pudo extraer la traduccion para ${part.label}.`);
        }

        translations[part.label] = match[1].trim();
    }

    return translations;
}

function extractBodyBlocks(rawBody = []) {
    const bodyBlocks = [];

    if (!Array.isArray(rawBody)) return bodyBlocks;

    rawBody.forEach((block, index) => {
        if (block.type === "html" && block.data) {
            bodyBlocks.push({ index, type: "html", original: block.data });
        } else if (block.type === "image" && block.data && block.data.url) {
            bodyBlocks.push({ index, type: "image", data: block.data });
        }
    });

    return bodyBlocks;
}

function buildFigureHtml(data) {
    return `<figure class="my-8"><img src="${data.url}" alt="${data.alt || ""}" class="w-full rounded-xl" /><figcaption class="text-xs text-center text-gray-500 mt-2">${data.caption || ""}</figcaption></figure>`;
}

function buildHtmlContent(bodyBlocks, translationsMap = {}) {
    let fullHtmlContent = "";

    bodyBlocks.forEach((block) => {
        if (block.type === "html") {
            fullHtmlContent += translationsMap[block.index] || block.original || "";
        } else if (block.type === "image") {
            fullHtmlContent += buildFigureHtml(block.data);
        }
    });

    return fullHtmlContent.trim();
}

function chunkHtmlBlocks(bodyBlocks) {
    const htmlBlocks = bodyBlocks.filter((block) => block.type === "html" && block.original);
    const chunks = [];
    let currentChunk = [];
    let currentChars = 0;

    htmlBlocks.forEach((block) => {
        const nextChars = currentChars + block.original.length;
        const shouldFlush =
            currentChunk.length >= MAX_HTML_BLOCKS_PER_CHUNK ||
            (currentChunk.length > 0 && nextChars > MAX_CHARS_PER_TRANSLATION_CHUNK);

        if (shouldFlush) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentChars = 0;
        }

        currentChunk.push(block);
        currentChars += block.original.length;
    });

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function resolveImageUrl(entry, bodyBlocks) {
    let imageUrl = null;
    const normalizeImageUrl = (url) => {
        if (!url) return null;

        try {
            const parsedUrl = new URL(url);
            parsedUrl.protocol = "https:";
            return parsedUrl.toString();
        } catch {
            return url;
        }
    };

    if (entry.topper && entry.topper.image && entry.topper.image.url) {
        imageUrl = normalizeImageUrl(entry.topper.image.url);
        logger.info(`Image found via topper: ${imageUrl}`);
    }

    if (!imageUrl && entry.images && Array.isArray(entry.images) && entry.images.length > 0) {
        const candidates = entry.images.filter((img) => {
            if (!img || !img.url) return false;
            const url = img.url.toLowerCase();
            if (url.includes("logo") || url.includes("icon") || url.includes("favicon")) return false;
            if (img.width && img.height && img.width >= 400 && img.height >= 200) return true;
            return true;
        });

        candidates.sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));

        const best = candidates.find((img) => {
            const w = img.width || 0;
            const h = img.height || 0;
            if (w > 0 && h > 0) {
                return (w / h) >= 1.0;
            }
            return true;
        }) || candidates[0];

        if (best && best.url) {
            imageUrl = normalizeImageUrl(best.url);
            logger.info(`Image found via images array: ${imageUrl} (${best.width}x${best.height})`);
        }
    }

    if (!imageUrl && entry.attachments && entry.attachments.thumbnail && entry.attachments.thumbnail.url) {
        imageUrl = normalizeImageUrl(entry.attachments.thumbnail.url);
        logger.info(`Image found via attachments: ${imageUrl}`);
    }

    if (!imageUrl) {
        const bodyImage = bodyBlocks.find((block) => block.type === "image" && block.data && block.data.url);
        if (bodyImage) {
            imageUrl = normalizeImageUrl(bodyImage.data.url);
            logger.info(`Image found via body content: ${imageUrl}`);
        }
    }

    return imageUrl;
}

function sanitizeForFirestore(data) {
    Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
            data[key] = null;
        }
    });

    return data;
}

function buildTranslationMetadata(status, error = null) {
    return {
        status,
        model: MODEL_NAME,
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        translatedAt: status === TRANSLATION_STATUS.TRANSLATED ? admin.firestore.FieldValue.serverTimestamp() : null,
        error: error || null,
    };
}

function serializeTranslationSource(title, excerpt, bodyBlocks) {
    return {
        title,
        excerpt,
        bodyBlocks: bodyBlocks.map((block) => {
            if (block.type === "html") {
                return {
                    index: block.index,
                    type: block.type,
                    original: block.original,
                };
            }

            return {
                index: block.index,
                type: block.type,
                data: {
                    url: block.data.url,
                    alt: block.data.alt || "",
                    caption: block.data.caption || "",
                },
            };
        }),
    };
}

async function translateArticleFields({ articleId, title, excerpt, bodyBlocks }) {
    const metadataTranslations = await translateStructuredParts([
        { label: "TITLE", text: title },
        { label: "EXCERPT", text: excerpt },
    ], `article:${articleId}:metadata`);

    const translationsMap = {};
    const htmlChunks = chunkHtmlBlocks(bodyBlocks);

    for (let index = 0; index < htmlChunks.length; index++) {
        const chunk = htmlChunks[index];
        const chunkTranslations = await translateStructuredParts(
            chunk.map((block) => ({
                label: `BLOCK_${block.index}`,
                text: block.original,
            })),
            `article:${articleId}:chunk:${index + 1}`
        );

        chunk.forEach((block) => {
            translationsMap[block.index] = chunkTranslations[`BLOCK_${block.index}`];
        });
    }

    const originalContent = buildHtmlContent(bodyBlocks);
    const translatedContent = buildHtmlContent(bodyBlocks, translationsMap);
    const translatedTitle = metadataTranslations.TITLE?.trim() || title;
    const translatedExcerpt = metadataTranslations.EXCERPT?.trim() || excerpt;

    if (!isMeaningfullyTranslated(
        `${title}\n${excerpt}\n${originalContent}`,
        `${translatedTitle}\n${translatedExcerpt}\n${translatedContent}`
    )) {
        throw new Error("Gemini devolvio el articulo sin traducir.");
    }

    return {
        translatedTitle,
        translatedExcerpt,
        translatedContent: translatedContent || translatedExcerpt || excerpt || "",
        originalContent,
    };
}

/**
 * Generates a LinkedIn post for the article
 */
async function generateSocialPost(articleData) {
    const prompt = `
    Actúa como un experto en redes sociales para una revista de tecnología de prestigio (MIT Technology Review en español).
    Tu tarea es crear un post de LinkedIn atractivo basado en el siguiente artículo:
    
    TÍTULO: ${articleData.title}
    EXTRACTO: ${articleData.excerpt}
    
    REQUISITOS DEL POST:
    - Lenguaje profesional pero cercano y provocador.
    - Menciona por qué esta tecnología o tendencia es importante ahora mismo.
    - Usa máximo 3 hashtags relevantes.
    - NO incluyas el enlace (Buffer lo añadirá).
    - Entre 100 y 250 palabras.
    - Escribe el post en Español de España.
    
    Responde ÚNICAMENTE con el texto del post.
    `;

    try {
        return await callGemini(prompt, `social:${articleData.originalId || articleData.title}`);
    } catch (error) {
        logger.error("Error generating social post:", error);
        return articleData.excerpt || "";
    }
}

/**
 * Common logic to fetch, translate, and sync articles
 */
async function processEntry(entry, logId, internalLogId) {
    const originalId = String(entry.id);
    logger.info(`Processing article: ${entry.title} (${originalId})`);

    // Update progress: starting translation
    if (internalLogId) {
        await logToFirestore('sync', 'in_progress', `Traduciendo: ${entry.title}...`, { logId }, internalLogId);
    }

    const rawExcerpt = (entry.dek || "").replace(/<[^>]*>?/gm, "").trim();
    const bodyBlocks = extractBodyBlocks(entry.body || []);
    const originalContent = buildHtmlContent(bodyBlocks);

    // API returns "topic" (singular object), not "topics" (array)
    const rawTopicName = entry.topic?.name || null;
    let category = mapTopicToCategory(rawTopicName);
    // If category is still "General", infer from article content
    if (category === "General") {
        category = inferCategoryFromContent(entry.title, rawExcerpt, originalContent);
    }
    const tags = [category];
    const imageUrl = resolveImageUrl(entry, bodyBlocks);

    const baseArticleData = {
        title: entry.title || "Sin título",
        excerpt: rawExcerpt || "",
        content: originalContent || rawExcerpt || "",
        category: category || "General",
        tags: tags || [],
        author: (entry.byline && entry.byline.length > 0) ? (entry.byline[0].text || "MIT Technology Review") : "MIT Technology Review",
        date: entry.published ? new Date(entry.published).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric' }),
        publishedAt: entry.published ? admin.firestore.Timestamp.fromDate(new Date(entry.published)) : admin.firestore.FieldValue.serverTimestamp(),
        imageUrl: imageUrl || null,
        readingTime: `${entry.word_count ? Math.ceil(entry.word_count / 200) : 5} min`,
        publicationStatus: "published",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalId: originalId,
        source: "MIT TR US"
    };

    try {
        const translatedFields = await translateArticleFields({
            articleId: originalId,
            title: baseArticleData.title,
            excerpt: rawExcerpt,
            bodyBlocks,
        });

        const articleData = sanitizeForFirestore({
            ...baseArticleData,
            title: translatedFields.translatedTitle || baseArticleData.title,
            excerpt: translatedFields.translatedExcerpt || baseArticleData.excerpt,
            content: translatedFields.translatedContent || baseArticleData.content,
            status: baseArticleData.publicationStatus,
            language: "es",
            translation: buildTranslationMetadata(TRANSLATION_STATUS.TRANSLATED),
        });

        // Auto-assign series image for "The Download" / "La Descarga" articles
        const titleForSeries = (articleData.title || "").trim();
        const originalTitle = (entry.title || "").trim();
        if (
            titleForSeries.startsWith("La Descarga:") ||
            titleForSeries.startsWith("La Descarga ") ||
            titleForSeries.toLowerCase().startsWith("the download") ||
            originalTitle.toLowerCase().startsWith("the download")
        ) {
            articleData.imageUrl = "https://storage.googleapis.com/techreview-mgz-1771952-media/series/the-download/the-download-header.png";
            articleData.series = "the-download";
            logger.info(`Auto-assigned "The Download" series image for: ${articleData.title}`);
        }

        logger.info(`Generating social post for: ${articleData.title}`);
        if (internalLogId) {
            await logToFirestore("sync", "in_progress", `Generando post social: ${articleData.title}...`, { logId }, internalLogId);
        }

        const linkedinPost = await generateSocialPost(articleData);
        articleData.socialPosts = {
            linkedin: linkedinPost,
            generatedAt: new Date().toISOString()
        };

        return {
            articleData: sanitizeForFirestore(articleData),
            syncStatus: "success",
        };
    } catch (error) {
        logger.error(`Translation failed for article ${originalId}:`, error);

        const fallbackData = sanitizeForFirestore({
            ...baseArticleData,
            status: "draft",
            language: "en",
            translation: buildTranslationMetadata(TRANSLATION_STATUS.FAILED, error.message),
            translationSource: serializeTranslationSource(baseArticleData.title, rawExcerpt, bodyBlocks),
        });

        // Auto-assign series image for "The Download" even on translation failure
        const origTitle = (entry.title || "").trim().toLowerCase();
        if (origTitle.startsWith("the download")) {
            fallbackData.imageUrl = "https://storage.googleapis.com/techreview-mgz-1771952-media/series/the-download/the-download-header.png";
            fallbackData.series = "the-download";
        }

        return {
            articleData: sanitizeForFirestore(fallbackData),
            syncStatus: "pending_translation",
            error: error.message,
        };
    }
}

async function logToFirestore(type, status, message, details = null, docId = null) {
    try {
        const logData = {
            timestamp: new Date(),
            type, // 'sync' | 'auth' | 'system'
            status, // 'success' | 'error' | 'in_progress'
            message,
            details: details || {}
        };

        if (docId) {
            await db.collection("api_logs").doc(docId).set(logData, { merge: true });
            return docId;
        } else {
            const docRef = await db.collection("api_logs").add(logData);
            return docRef.id;
        }
    } catch (error) {
        logger.error("Error writing to api_logs collection:", error);
        return null;
    }
}

function buildArticleDocId(title, fallbackId) {
    const slug = String(title || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

    return slug || `articulo-${fallbackId}`;
}

async function buildUniqueArticleSlug(title, fallbackId) {
    const baseSlug = buildArticleDocId(title, fallbackId);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
        const existingDoc = await db.collection("articles").doc(uniqueSlug).get();
        if (!existingDoc.exists) {
            return uniqueSlug;
        }

        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }
}

function getPublicationStatus(data = {}) {
    if (data.publicationStatus) return data.publicationStatus;
    if (data.status && data.status !== "draft") return data.status;
    return "published";
}

function isArticleFullyTranslated(data = {}) {
    if (data.translation?.status === TRANSLATION_STATUS.TRANSLATED) {
        return true;
    }

    if (data.translation?.status) {
        return false;
    }

    if (data.source === "MIT TR US") {
        return false;
    }

    return data.language === "es";
}

async function retryArticleTranslation(docSnap, logId, internalLogId) {
    const data = docSnap.data() || {};
    const translationSource = data.translationSource || {};
    const sourceTitle = translationSource.title || data.title || "Sin título";
    const sourceExcerpt = translationSource.excerpt || data.excerpt || "";
    const sourceBlocks = Array.isArray(translationSource.bodyBlocks) && translationSource.bodyBlocks.length > 0
        ? translationSource.bodyBlocks
        : [{ index: 0, type: "html", original: data.content || "" }];

    if (internalLogId) {
        await logToFirestore("sync", "in_progress", `Reintentando traduccion: ${sourceTitle}...`, { logId, docId: docSnap.id }, internalLogId);
    }

    const translatedFields = await translateArticleFields({
        articleId: data.originalId || docSnap.id,
        title: sourceTitle,
        excerpt: sourceExcerpt,
        bodyBlocks: sourceBlocks,
    });

    const publicationStatus = getPublicationStatus(data);
    const nextData = sanitizeForFirestore({
        title: translatedFields.translatedTitle || sourceTitle,
        excerpt: translatedFields.translatedExcerpt || sourceExcerpt,
        content: translatedFields.translatedContent || data.content || sourceExcerpt || "",
        status: publicationStatus,
        publicationStatus,
        language: "es",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        translation: buildTranslationMetadata(TRANSLATION_STATUS.TRANSLATED),
        translationSource: admin.firestore.FieldValue.delete(),
    });

    const linkedinPost = await generateSocialPost({
        ...data,
        ...nextData,
        originalId: data.originalId || docSnap.id,
    });

    nextData.socialPosts = {
        linkedin: linkedinPost,
        generatedAt: new Date().toISOString()
    };

    await docSnap.ref.set(nextData, { merge: true });

    return {
        id: docSnap.id,
        title: nextData.title,
        status: "updated"
    };
}

async function retryPendingTranslations(limit = 10) {
    const logId = `retry_${Date.now()}`;
    const internalLogId = await logToFirestore("sync", "in_progress", `Reintentando traducciones pendientes (limit=${limit})`, { logId });

    try {
        getModel();

        const [pendingSnap, englishSnap] = await Promise.all([
            db.collection("articles")
                .where("translation.status", "in", [TRANSLATION_STATUS.PENDING, TRANSLATION_STATUS.FAILED])
                .limit(limit)
                .get(),
            db.collection("articles")
                .where("language", "==", "en")
                .limit(limit)
                .get(),
        ]);

        const docsById = new Map();
        [...pendingSnap.docs, ...englishSnap.docs].forEach((doc) => {
            const data = doc.data() || {};
            if (data.source === "MIT TR US" || data.originalId) {
                docsById.set(doc.id, doc);
            }
        });

        const docsToRetry = Array.from(docsById.values()).slice(0, limit);

        if (docsToRetry.length === 0) {
            const msg = "No hay articulos pendientes de traduccion.";
            await logToFirestore("sync", "success", msg, { logId, recoveredCount: 0 }, internalLogId);
            return 0;
        }

        const processedArticles = [];
        let recoveredCount = 0;
        let failedCount = 0;

        for (let index = 0; index < docsToRetry.length; index++) {
            const docSnap = docsToRetry[index];
            const data = docSnap.data() || {};

            await logToFirestore("sync", "in_progress", `Reprocesando traduccion ${index + 1} de ${docsToRetry.length}...`, {
                logId,
                current: index + 1,
                total: docsToRetry.length,
                docId: docSnap.id,
            }, internalLogId);

            try {
                const result = await retryArticleTranslation(docSnap, logId, internalLogId);
                processedArticles.push(result);
                recoveredCount++;
            } catch (error) {
                failedCount++;
                logger.error(`Retry translation failed for article ${docSnap.id}:`, error);

                await docSnap.ref.set({
                    publicationStatus: getPublicationStatus(data),
                    status: "draft",
                    language: data.language || "en",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    translation: buildTranslationMetadata(TRANSLATION_STATUS.FAILED, error.message),
                }, { merge: true });

                processedArticles.push({
                    id: docSnap.id,
                    title: data.title || "Artículo sin título",
                    status: "error",
                    error: error.message,
                });
            }
        }

        const summaryStatus = failedCount > 0 ? "error" : "success";
        const summaryMessage = failedCount > 0
            ? `Reintento completado con incidencias: ${recoveredCount} articulos recuperados, ${failedCount} siguen pendientes.`
            : `Reintento completado: ${recoveredCount} articulos traducidos correctamente.`;

        await logToFirestore("sync", summaryStatus, summaryMessage, {
            logId,
            recoveredCount,
            failedCount,
            processedArticles,
        }, internalLogId);

        return recoveredCount;
    } catch (error) {
        logger.error("Retry pending translations error:", error);
        await logToFirestore("sync", "error", `Error reintentando traducciones: ${error.message}`, {
            logId,
            stack: error.stack,
        }, internalLogId);
        throw error;
    }
}

/**
 * Common logic to fetch, translate, and sync articles
 */
async function performSync(limit = 5, offset = 0) {
    let syncedCount = 0;
    const processedArticles = [];
    const logId = `sync_${Date.now()}`;
    const counters = {
        created: 0,
        updated: 0,
        translated: 0,
        pendingTranslation: 0,
        skipped: 0,
        failed: 0,
    };

    const internalLogId = await logToFirestore("sync", "in_progress", `Iniciando sincronizacion (limit=${limit}, offset=${offset})`, { logId });

    try {
        getModel();

        const apiUrl = `https://wp.technologyreview.com/wp-json/mittr/v1/entries?limit=${limit}&offset=${offset}&sort=recent`;
        logger.info(`Fetching articles from: ${apiUrl}`);
        const response = await axios.get(apiUrl);
        const entries = response.data.entries;

        if (!entries || !Array.isArray(entries)) {
            const msg = "No se encontraron entradas en la respuesta de la API";
            logger.info(msg);
            await logToFirestore("sync", "success", msg, { logId, syncedCount: 0 }, internalLogId);
            return 0;
        }

        for (const entry of entries) {
            const originalId = String(entry.id);

            await logToFirestore("sync", "in_progress", `Procesando articulo ${syncedCount + 1} de ${entries.length}...`, {
                logId,
                current: syncedCount + 1,
                total: entries.length,
            }, internalLogId);

            try {
                const existingSnapshot = await db.collection("articles")
                    .where("originalId", "==", originalId)
                    .limit(1)
                    .get();
                const existingDoc = existingSnapshot.docs[0] || null;
                const existingData = existingDoc?.data() || null;

                if (existingDoc && isArticleFullyTranslated(existingData)) {
                    logger.info(`Article already translated, skipping: ${entry.title || originalId}`);
                    processedArticles.push({
                        id: existingDoc.id,
                        title: existingData.title || entry.title || "Artículo sin título",
                        status: "skipped"
                    });
                    counters.skipped++;
                    syncedCount++;
                    continue;
                }

                const result = await processEntry(entry, logId, internalLogId);
                const articleDataToSave = {
                    ...result.articleData,
                    isFeaturedInHeader: existingData?.isFeaturedInHeader === true || existingData?.status === "featured",
                };

                let articleId = existingDoc?.id || null;
                if (existingDoc) {
                    logger.info(`Updating existing article: ${articleId}`);
                    await existingDoc.ref.set(articleDataToSave, { merge: true });
                } else {
                    articleId = await buildUniqueArticleSlug(articleDataToSave.title, originalId);
                    logger.info(`Creating new article: ${articleDataToSave.title} with slug: ${articleId}`);
                    await db.collection("articles").doc(articleId).set(articleDataToSave);
                    counters.created++;
                }

                if (existingDoc) {
                    counters.updated++;
                }

                if (result.syncStatus === "pending_translation") {
                    counters.pendingTranslation++;
                    processedArticles.push({
                        id: articleId,
                        title: articleDataToSave.title,
                        status: "pending_translation",
                        error: result.error,
                    });
                } else {
                    counters.translated++;
                    processedArticles.push({
                        id: articleId,
                        title: articleDataToSave.title,
                        status: existingDoc ? "updated" : "success",
                    });
                }
            } catch (articleError) {
                counters.failed++;
                logger.error(`Error processing article ${originalId}:`, articleError);
                processedArticles.push({
                    id: originalId,
                    title: entry.title || "Artículo sin título",
                    status: "error",
                    error: articleError.message
                });
            }

            syncedCount++;
        }

        const hasIssues = counters.pendingTranslation > 0 || counters.failed > 0;
        const summaryStatus = hasIssues ? "error" : "success";
        const summaryMessage = hasIssues
            ? `Sincronizacion completada con incidencias: ${counters.translated} traducidos, ${counters.pendingTranslation} pendientes, ${counters.failed} con error y ${counters.skipped} omitidos.`
            : `Sincronizacion completada: ${counters.translated} articulos traducidos (${counters.created} nuevos, ${counters.updated} actualizados).`;

        await logToFirestore("sync", summaryStatus, summaryMessage, {
            logId,
            syncedCount,
            counters,
            processedArticles,
        }, internalLogId);

        return syncedCount;
    } catch (error) {
        logger.error("Sync error:", error);
        await logToFirestore("sync", "error", `Error en la sincronizacion: ${error.message}`, { logId, stack: error.stack }, internalLogId);
        throw error;
    }
}

/**
 * Scheduled trigger
 */
exports.syncMITArticles = onSchedule({
    schedule: "0 8 * * *",
    timeZone: "Europe/Madrid",
    secrets: TRANSLATION_SECRET_NAMES,
}, async () => {
    await performSync();
});

exports.retryPendingArticleTranslations = onSchedule({
    schedule: "15 8-20 * * *",
    timeZone: "Europe/Madrid",
    secrets: TRANSLATION_SECRET_NAMES,
}, async () => {
    await retryPendingTranslations();
});

/**
 * Manual trigger for debugging
 * Usage: https://.../manualSync?limit=5&offset=0
 */
exports.manualSync = onCall({
    timeoutSeconds: 1200,
    maxInstances: 1,
    memory: "1GiB",
    secrets: TRANSLATION_SECRET_NAMES,
}, async (request) => {
    try {
        const limit = parseInt(request.data.limit) || 5;
        const offset = parseInt(request.data.offset) || 0;

        logger.info(`Starting manual sync with limit=${limit}, offset=${offset}`);
        const count = await performSync(limit, offset);
        return { success: true, count, message: `Sincronización finalizada. ${count} artículos sincronizados.` };
    } catch (error) {
        logger.error("Manual sync error", error);
        // Provide more detailed information if it was a timeout
        const errorMsg = error.toString();
        if (errorMsg.includes("DEADLINE_EXCEEDED") || errorMsg.includes("timeout")) {
            throw new Error("El proceso excedió el tiempo límite (9 min). Intenta sincronizar menos artículos a la vez.");
        }
        throw new Error(errorMsg);
    }
});

exports.retryTranslationsNow = onCall({
    timeoutSeconds: 1200,
    maxInstances: 1,
    memory: "1GiB",
    secrets: TRANSLATION_SECRET_NAMES,
}, async (request) => {
    try {
        const limit = parseInt(request.data.limit) || 10;
        const count = await retryPendingTranslations(limit);
        return { success: true, count, message: `Reintento finalizado. ${count} articulos recuperados.` };
    } catch (error) {
        logger.error("Manual retry translations error", error);
        throw new Error(error.toString());
    }
});

/**
 * Re-categorize articles tagged as "General" by fetching their original topic from the API
 */
exports.recategorizeGeneralArticles = onCall({
    timeoutSeconds: 300,
    maxInstances: 1,
    memory: "512MiB",
}, async (request) => {
    const results = { updated: 0, skipped: 0, failed: 0, details: [] };

    try {
        const snapshot = await db.collection("articles")
            .where("category", "==", "General")
            .get();

        if (snapshot.empty) {
            return { success: true, message: "No articles with 'General' category found.", results };
        }

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const originalId = data.originalId;

            try {
                // Try to fetch original topic from MIT TR API
                let newCategory = null;
                if (originalId) {
                    const apiUrl = `https://wp.technologyreview.com/wp-json/mittr/v1/entry/${originalId}`;
                    try {
                        const response = await axios.get(apiUrl);
                        const topicName = response.data?.topic?.name || null;
                        if (topicName) {
                            newCategory = mapTopicToCategory(topicName);
                        }
                    } catch (apiErr) {
                        logger.warn(`Could not fetch API data for article ${originalId}: ${apiErr.message}`);
                    }
                }

                // If still General or no API data, auto-assign based on content analysis
                if (!newCategory || newCategory === "General") {
                    newCategory = inferCategoryFromContent(data.title, data.excerpt, data.content);
                }

                if (newCategory && newCategory !== "General") {
                    await doc.ref.update({
                        category: newCategory,
                        tags: admin.firestore.FieldValue.arrayUnion(newCategory),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    results.updated++;
                    results.details.push({ id: doc.id, title: data.title, newCategory });
                    logger.info(`Recategorized "${data.title}" → ${newCategory}`);
                } else {
                    results.skipped++;
                    results.details.push({ id: doc.id, title: data.title, reason: "Could not determine category" });
                }
            } catch (err) {
                results.failed++;
                results.details.push({ id: doc.id, title: data.title, error: err.message });
                logger.error(`Error recategorizing ${doc.id}:`, err);
            }
        }

        return {
            success: true,
            message: `Recategorization complete: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed.`,
            results,
        };
    } catch (error) {
        logger.error("Recategorize error:", error);
        throw new Error(error.toString());
    }
});

/**
 * Infer a category from article title, excerpt, and content using keyword matching
 */
function inferCategoryFromContent(title, excerpt, content) {
    const text = `${title || ""} ${excerpt || ""} ${(content || "").substring(0, 2000)}`.toLowerCase();

    const categoryKeywords = {
        "Inteligencia Artificial": [
            "inteligencia artificial", " ia ", " ai ", "machine learning", "aprendizaje automático",
            "deep learning", "aprendizaje profundo", "chatgpt", "openai", "gpt", "llm",
            "modelo de lenguaje", "red neuronal", "neural network", "algoritmo", "automatización",
            "robot", "visión artificial", "procesamiento de lenguaje", "nlp", "generativa",
            "gemini", "claude", "anthropic", "deepmind", "copilot", "chatbot",
        ],
        "Biotecnología": [
            "biotecnología", "biotech", "gen ", "genética", "genoma", "crispr",
            "célula", "proteína", "fármaco", "medicamento", "vacuna", "médic",
            "salud", "enfermedad", "cáncer", "terapia", "clínic", "hospital",
            "biología", "neurociencia", "cerebro", "adn", "arn",
            "psicodélico", "psilocibina", "mdma",
        ],
        "Energía": [
            "energía", "energy", "batería", "battery", "solar", "eólica", "wind",
            "nuclear", "reactor", "fisión", "fusión", "hidrógeno", "hydrogen",
            "eléctric", "electric", "red eléctrica", "grid", "renovable", "renewable",
            "petróleo", "gas natural", "carbón",
        ],
        "Espacio": [
            "espacio", "space", "nasa", "spacex", "cohete", "rocket", "satélite",
            "órbita", "orbit", "luna", "moon", "marte", "mars", "asteroid",
            "astronaut", "telescopio", "telescope", "galaxia", "galaxy", "cosmos",
            "estación espacial", "lanzamiento",
        ],
        "Sostenibilidad": [
            "sostenibilidad", "sustainability", "cambio climático", "climate change",
            "emisiones", "emissions", "carbono", "carbon", "contaminación", "pollution",
            "reciclaje", "recycl", "medio ambiente", "environment", "biodiversidad",
            "incendio forestal", "wildfire", "calentamiento global", "deforestación",
            "océano", "agua",
        ],
        "Negocios": [
            "negocio", "business", "empresa", "company", "startup", "inversión",
            "inversor", "capital", "mercado", "market", "acción", "bolsa",
            "regulación", "regulation", "política", "policy", "gobierno", "government",
            "pentágono", "pentagon", "defensa", "militar", "geopolítica",
            "china", "ee.uu", "congreso", "senado",
        ],
    };

    let bestCategory = "General";
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        let score = 0;
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestCategory = category;
        }
    }

    return bestScore > 0 ? bestCategory : "Inteligencia Artificial";
}

/**
 * Sends a Magic Link via Resend
 */
exports.sendMagicLink = onCall({
    secrets: ["RESEND_API_KEY"],
    maxInstances: 10
}, async (request) => {
    const { email, url, isInvitation } = request.data;

    logger.info("sendMagicLink invoked", { email, url, isInvitation });

    if (!email) {
        logger.error("Email missing in sendMagicLink request");
        throw new Error("El email es obligatorio");
    }

    try {
        const isGmail = email.toLowerCase().endsWith("@gmail.com");
        const targetUrl = url || "https://technologyreview.es/subscribe";

        let subject = "Tu enlace de acceso a MIT Technology Review";
        let htmlContent = "";
        let magicLink = "";

        if (isInvitation && isGmail) {
            // Special treatment for Gmail invitations: guide them to Google Login
            subject = "Bienvenido al CMS de MIT Technology Review";
            htmlContent = `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #ffffff; border-top: 8px solid #000000;">
                    <h1 style="font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; margin-bottom: 24px; text-transform: uppercase;">MIT Technology Review</h1>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4b5563;">
                        Has sido autorizado para acceder al CMS de MIT Technology Review en español. 
                        Dado que usas una cuenta de Gmail, puedes iniciar sesión de forma rápida y segura usando el botón <strong>"ENTRAR CON GOOGLE"</strong>.
                    </p>
                    <a href="${targetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; transition: background-color 0.2s ease;">
                        Ir al CMS
                    </a>
                    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
                        <p>&copy; ${new Date().getFullYear()} MIT Technology Review en español</p>
                    </div>
                </div>
            `;
            logger.info("Sending Google Login invitation (Gmail)", { email });
        } else {
            // Standard Magic Link (either Login or non-Gmail invitation)
            const actionCodeSettings = {
                url: targetUrl,
                handleCodeInApp: true,
            };

            magicLink = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

            if (isInvitation) {
                subject = "Invitación al CMS de MIT Technology Review";
                htmlContent = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #ffffff; border-top: 8px solid #000000;">
                        <h1 style="font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; margin-bottom: 24px; text-transform: uppercase;">MIT Technology Review</h1>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4b5563;">
                            Has sido invitado a colaborar en MIT Technology Review en español. 
                            Haz clic en el botón de abajo para activar tu acceso e iniciar sesión.
                        </p>
                        <a href="${magicLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; transition: background-color 0.2s ease;">
                            Activar Acceso
                        </a>
                        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
                            <p>&copy; ${new Date().getFullYear()} MIT Technology Review en español</p>
                        </div>
                    </div>
                `;
            } else {
                htmlContent = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #ffffff; border-top: 8px solid #000000;">
                        <h1 style="font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; margin-bottom: 24px; text-transform: uppercase;">MIT Technology Review</h1>
                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4b5563;">
                            Has solicitado un enlace de acceso para entrar en tu cuenta de MIT Technology Review en español. 
                            Haz clic en el botón de abajo para iniciar sesión de forma segura.
                        </p>
                        <a href="${magicLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; transition: background-color 0.2s ease;">
                            Iniciar Sesión
                        </a>
                        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
                            <p>&copy; ${new Date().getFullYear()} MIT Technology Review en español</p>
                        </div>
                    </div>
                `;
            }
            logger.info("Generated magic link", { email, isInvitation });
        }

        const { Resend } = require("resend");
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            logger.error("RESEND_API_KEY environment variable is not set");
            throw new Error("RESEND_API_KEY no configurada");
        }

        const resend = new Resend(resendApiKey);

        const { data, error: resendError } = await resend.emails.send({
            from: "MIT Technology Review <onboarding@resend.dev>", // TODO: Update to verified domain
            to: email,
            subject: subject,
            html: htmlContent
        });

        if (resendError) {
            logger.error("Resend API error", { error: resendError, email });
            throw new Error(`Error de Resend: ${resendError.message}`);
        }

        logger.info("Magic link email sent successfully", { id: data.id, email });
        return { success: true, id: data.id };
    } catch (error) {
        logger.error("Error in sendMagicLink function:", error);
        throw new Error(error.message || "No se pudo enviar el email de acceso");
    }
});

/**
 * Syncs Firestore subscribers to Mailchimp
 */
exports.syncSubscriberToMailchimp = onDocumentWritten({
    document: "subscribers/{subscriberId}",
    secrets: ["MAILCHIMP_API_KEY", "MAILCHIMP_AUDIENCE_ID"]
}, async (event) => {
    const newData = event.data.after ? event.data.after.data() : null;
    const oldData = event.data.before ? event.data.before.data() : null;

    if (!newData || !newData.email) {
        logger.info("No data or email found, skipping Mailchimp sync");
        return;
    }

    // Only sync if pertinent fields changed
    const hasChanged = !oldData ||
        oldData.newsletterSubscribed !== newData.newsletterSubscribed ||
        oldData.displayName !== newData.displayName ||
        oldData.email !== newData.email;

    if (!hasChanged) {
        logger.info(`No changes for ${newData.email}, skipping Mailchimp sync`);
        return;
    }

    const apiKey = (process.env.MAILCHIMP_API_KEY || "").trim();
    const listId = (process.env.MAILCHIMP_AUDIENCE_ID || "").trim();

    if (!apiKey || !listId) {
        logger.error("Mailchimp API Key or List ID missing in environment variables");
        return;
    }

    try {
        const datacenter = apiKey.split("-")[1];
        if (!datacenter) {
            logger.error(`Invalid Mailchimp API Key format: ${apiKey}`);
            return;
        }
        const emailHash = crypto.createHash("md5").update(newData.email.toLowerCase()).digest("hex");
        const url = `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members/${emailHash}`;

        // Prepare the base payload for the update/upsert
        const payload = {
            email_address: newData.email,
            merge_fields: {
                FNAME: newData.displayName || ""
            }
        };

        // Logic for subscription status:
        // 1. If Firestore explicitly says true -> set as 'subscribed'
        // 2. If Firestore explicitly says false -> set as 'unsubscribed'
        // 3. If Firestore doesn't mention it (standard login profile creation),
        //    we use status_if_new: 'unsubscribed' but we DON'T send 'status'
        //    so that if they ALREADY exist in Mailchimp, their current status is preserved.

        if (newData.newsletterSubscribed === true) {
            payload.status = "subscribed";
            payload.status_if_new = "subscribed";
        } else if (newData.newsletterSubscribed === false) {
            payload.status = "unsubscribed";
            payload.status_if_new = "unsubscribed";
        } else {
            // User just logged in, we don't know their preference from the app yet.
            // If they are NEW to Mailchimp, they will be unsubscribed by default.
            // If they ALREADY exist, Mailchimp will keep their status because we DON'T send the 'status' field here.
            payload.status_if_new = "unsubscribed";
        }

        logger.info(`Syncing ${newData.email} to Mailchimp. Preserving status if exists.`);

        await axios.put(url, payload, {
            headers: {
                Authorization: `apikey ${apiKey}`
            }
        });

        logger.info(`Mailchimp sync success for ${newData.email}`);
    } catch (error) {
        // Log detailed error from Mailchimp but don't crash the function
        const errorData = error.response ? error.response.data : error.message;
        logger.error(`Mailchimp sync error for ${newData.email}:`, errorData);
    }
});

/**
 * Temporary Migration function to fix article formatting
 */
exports.migrateArticleFormatting = onRequest({ timeoutSeconds: 540, memory: "1Gi" }, async (req, res) => {
    // Ported cleanContent logic
    function cleanContent(content) {
        if (!content) return "";
        let cleaned = content
            .replace(/rnrnrn/g, '\n\n')
            .replace(/rnrn/g, '\n\n')
            .replace(/rn/g, '\n')
            .replace(/\\r\\n|\\n|\r\n/g, '\n')
            .replace(/\\_/g, ' ')
            .replace(/([a-z])\n([a-z])/g, '$1 $2')
            .replace(/([.!?])\n([A-ZÁÉÍÓÚ])/g, '$1\n\n$2');

        cleaned = cleaned.replace(/n<(p|h|ul|ol|div|blockquote|section|figure|img)/gi, '\n<$1');
        cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        });

        const hasParagraphs = /<p[\s\S]*?>/i.test(cleaned);
        if (!hasParagraphs) {
            const blockElements = /^\s*<(h[1-6]|figure|blockquote|ul|ol|li|div|section|article|img|iframe|table|hr)/i;
            const paragraphs = cleaned.split(/\n{2,}/).filter(p => p.trim().length > 0);
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
        cleaned = cleaned.replace(/<p>\s*<\/p>/g, '').trim();
        return cleaned;
    }

    try {
        const articlesRef = db.collection("articles");
        let processedCount = 0;
        let updatedCount = 0;
        let lastDoc = null;
        const PAGE_SIZE = 500;

        while (true) {
            let query = articlesRef.orderBy("__name__").limit(PAGE_SIZE);
            if (lastDoc) query = query.startAfter(lastDoc);

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

            if (batchCount > 0) await batch.commit();

            logger.info(`Migration Progress: ${processedCount} processed, ${updatedCount} updated.`);
            if (snapshot.docs.length < PAGE_SIZE) break;
        }

        res.status(200).send(`Migration complete. Processed ${processedCount}, Updated ${updatedCount}.`);
    } catch (error) {
        logger.error("Migration error", error);
        res.status(500).send(error.toString());
    }
});
