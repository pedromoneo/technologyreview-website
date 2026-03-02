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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        logger.error("Error generating social post:", error);
        return articleData.excerpt || "";
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

    // Generate social post
    logger.info(`Generating social post for: ${articleData.title}`);
    const linkedinPost = await generateSocialPost(articleData);
    articleData.socialPosts = {
        linkedin: linkedinPost,
        generatedAt: new Date().toISOString()
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

/**
 * Sends a Magic Link via Resend
 */
exports.sendMagicLink = onCall({
    secrets: ["RESEND_API_KEY"],
    maxInstances: 10
}, async (request) => {
    const { email, url } = request.data;

    if (!email) {
        throw new Error("El email es obligatorio");
    }

    try {
        const actionCodeSettings = {
            url: url || "https://technologyreview.es/subscribe",
            handleCodeInApp: true,
        };

        const link = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

        const { Resend } = require("resend");
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            throw new Error("RESEND_API_KEY no configurada");
        }

        const resend = new Resend(resendApiKey);

        await resend.emails.send({
            from: "MIT Technology Review <onboarding@resend.dev>", // TODO: Update to verified domain
            to: email,
            subject: "Tu enlace de acceso a MIT Technology Review",
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a1a1a; background-color: #ffffff; border-top: 8px solid #000000;">
                    <h1 style="font-size: 28px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; margin-bottom: 24px; text-transform: uppercase;">MIT Technology Review</h1>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #4b5563;">
                        Has solicitado un enlace de acceso para entrar en tu cuenta de MIT Technology Review en español. 
                        Haz clic en el botón de abajo para iniciar sesión de forma segura.
                    </p>
                    <a href="${link}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 14px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em; transition: background-color 0.2s ease;">
                        Iniciar Sesión
                    </a>
                    <p style="font-size: 14px; line-height: 1.6; margin-top: 32px; color: #9ca3af;">
                        Este enlace caducará en breve. Si no has solicitado este acceso, puedes ignorar este email de forma segura.
                    </p>
                    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
                        <p>&copy; ${new Date().getFullYear()} MIT Technology Review en español</p>
                    </div>
                </div>
            `
        });

        return { success: true };
    } catch (error) {
        logger.error("Error enviando Magic Link:", error);
        throw new Error("No se pudo enviar el email de acceso");
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

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const listId = process.env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !listId) {
        logger.error("Mailchimp API Key or List ID missing in environment variables");
        return;
    }

    try {
        const datacenter = apiKey.split("-")[1];
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
                Authorization: `Bearer ${apiKey}`
            }
        });

        logger.info(`Mailchimp sync success for ${newData.email}`);
    } catch (error) {
        // Log detailed error from Mailchimp but don't crash the function
        const errorData = error.response ? error.response.data : error.message;
        logger.error(`Mailchimp sync error for ${newData.email}:`, errorData);
    }
});
