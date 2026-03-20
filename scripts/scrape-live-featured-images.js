/**
 * Scrape featured images from the live technologyreview.es WordPress site
 * for articles that still have Unsplash fallback images.
 *
 * Flow:
 * 1. Fetch all Firestore articles with Unsplash imageUrl
 * 2. For each, build the live WordPress URL from legacySlug/originalId
 * 3. Fetch the HTML page and extract the og:image or featured image
 * 4. Download the image, upload to Firebase Storage, update Firestore
 */
const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BACKUP_DIR = path.resolve(__dirname, "../backup_data");
const MANIFEST_PATH = path.join(BACKUP_DIR, "scraped_images_manifest.json");
const LIVE_HOST = "https://technologyreview.es";
const MAX_CONCURRENCY = 3;
const REQUEST_DELAY_MS = 500; // Be polite to the live site
const HTTP_TIMEOUT_MS = 30000;
const SAVE_INTERVAL = 25;

function parseArgs(argv) {
    const args = {
        dryRun: argv.includes("--dry-run"),
        limit: Infinity,
    };

    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    if (limitArg) {
        const parsed = Number.parseInt(limitArg.split("=")[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            args.limit = parsed;
        }
    }

    return args;
}

function getServiceAccount() {
    const rawKey = process.env.ADMIN_SDK_KEY;
    if (!rawKey) throw new Error("ADMIN_SDK_KEY not set in .env.local");
    try {
        return JSON.parse(rawKey);
    } catch {
        return JSON.parse(Buffer.from(rawKey, "base64").toString("utf8"));
    }
}

function ensureFirebase() {
    if (admin.apps.length > 0) return admin.app();
    return admin.initializeApp({
        credential: admin.credential.cert(getServiceAccount()),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return { version: 1, items: {}, failures: {} };
    }
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest) {
    manifest.generatedAt = new Date().toISOString();
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function buildPublicBucketUrl(bucketName, objectPath) {
    return `https://storage.googleapis.com/${bucketName}/${String(objectPath).split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

async function fetchWithTimeout(url, timeoutMs = HTTP_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; TechReview-Migration/1.0)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/*;q=0.8",
            },
        });
    } finally {
        clearTimeout(timeout);
    }
}

function extractFeaturedImageUrl(html) {
    // Try og:image first (most reliable for featured images)
    const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
    if (ogMatch) {
        const url = ogMatch[1];
        // Skip placeholder/default images
        if (!url.includes("unsplash") && !url.includes("placeholder") && !url.includes("default-image")) {
            return url;
        }
    }

    // Try twitter:image
    const twitterMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']twitter:image["']/i);
    if (twitterMatch) {
        const url = twitterMatch[1];
        if (!url.includes("unsplash") && !url.includes("placeholder")) {
            return url;
        }
    }

    // Try wp-post-image class (WordPress featured image pattern)
    const wpImageMatch = html.match(/<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]*src=["']([^"']+)["']/i)
        || html.match(/<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*wp-post-image[^"']*["']/i);
    if (wpImageMatch) {
        return wpImageMatch[1];
    }

    // Try featured-image or post-thumbnail containers
    const featuredMatch = html.match(/<(?:div|figure)[^>]+class=["'][^"']*(?:featured-image|post-thumbnail)[^"']*["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    if (featuredMatch) {
        return featuredMatch[1];
    }

    return null;
}

function buildLiveUrl(docData) {
    // Try legacySlug first
    const slug = docData.legacySlug || docData.slug;
    if (slug) {
        return `${LIVE_HOST}/article/${slug}/`;
    }

    // Try originalId to build WordPress URL
    const originalId = docData.originalId;
    if (originalId) {
        return `${LIVE_HOST}/?p=${originalId}`;
    }

    return null;
}

function inferExtension(sourceUrl, contentType) {
    try {
        const pathname = new URL(sourceUrl).pathname;
        const ext = path.extname(pathname).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"].includes(ext)) return ext;
    } catch {}

    if (contentType === "image/png") return ".png";
    if (contentType === "image/webp") return ".webp";
    if (contentType === "image/gif") return ".gif";
    return ".jpg";
}

async function downloadImage(imageUrl) {
    const response = await fetchWithTimeout(imageUrl);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
        throw new Error(`Unexpected content-type: ${contentType}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) {
        throw new Error(`Image too small (${buffer.length} bytes), likely a placeholder`);
    }

    return { buffer, contentType };
}

async function uploadToStorage(bucket, articleId, sourceUrl, buffer, contentType) {
    const extension = inferExtension(sourceUrl, contentType);
    const sourceHash = crypto.createHash("sha1").update(sourceUrl).digest("hex");
    const objectPath = `scraped/articles/${articleId}/${sourceHash}${extension}`;
    await bucket.file(objectPath).save(buffer, {
        resumable: false,
        contentType,
        metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: { scrapedFrom: sourceUrl, articleId: String(articleId) },
        },
    });
    await bucket.file(objectPath).makePublic();
    return {
        objectPath,
        publicUrl: buildPublicBucketUrl(bucket.name, objectPath),
    };
}

async function processArticle(docSnap, bucket, manifest, options) {
    const data = docSnap.data() || {};
    const docId = docSnap.id;

    // Skip if already processed
    if (manifest.items[docId]) return { status: "skipped" };
    if (manifest.failures[docId]) return { status: "skipped" };

    const liveUrl = buildLiveUrl(data);
    if (!liveUrl) return { status: "no-url" };

    try {
        // Fetch the live WordPress page
        const pageResponse = await fetchWithTimeout(liveUrl);
        if (!pageResponse.ok) {
            manifest.failures[docId] = { error: `Page HTTP ${pageResponse.status}`, url: liveUrl };
            return { status: "page-error" };
        }

        const html = await pageResponse.text();
        const imageUrl = extractFeaturedImageUrl(html);

        if (!imageUrl) {
            manifest.failures[docId] = { error: "No featured image found", url: liveUrl };
            return { status: "no-image" };
        }

        if (options.dryRun) {
            console.log(`  [dry] ${docId} -> ${imageUrl}`);
            return { status: "would-update", imageUrl };
        }

        // Download and upload the image
        const downloaded = await downloadImage(imageUrl);
        const uploaded = await uploadToStorage(bucket, docId, imageUrl, downloaded.buffer, downloaded.contentType);

        // Update Firestore
        await docSnap.ref.set({
            imageUrl: uploaded.publicUrl,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            assetScrape: {
                lastScrapedAt: admin.firestore.FieldValue.serverTimestamp(),
                sourceUrl: imageUrl,
                pageUrl: liveUrl,
            },
        }, { merge: true });

        manifest.items[docId] = {
            objectPath: uploaded.objectPath,
            publicUrl: uploaded.publicUrl,
            sourceUrl: imageUrl,
            pageUrl: liveUrl,
            scrapedAt: new Date().toISOString(),
        };

        console.log(`  ✓ ${docId} -> ${uploaded.publicUrl}`);
        return { status: "updated" };

    } catch (error) {
        manifest.failures[docId] = { error: error.message, url: liveUrl };
        return { status: "error", error: error.message };
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const manifest = loadManifest();

    console.log(`Starting live site image scraping${options.dryRun ? " (dry run)" : ""}...`);
    console.log(`Limit: ${options.limit === Infinity ? "none" : options.limit}`);
    console.log(`Storage bucket: ${bucket.name}`);

    // Fetch all articles
    const snapshot = await db.collection("articles").get();
    console.log(`Total articles: ${snapshot.size}`);

    // Filter to articles with Unsplash fallback images
    const unsplashArticles = snapshot.docs.filter((doc) => {
        const data = doc.data() || {};
        const imageUrl = data.imageUrl || "";
        return imageUrl.includes("images.unsplash.com") || !imageUrl;
    });

    console.log(`Articles with Unsplash/missing images: ${unsplashArticles.length}`);
    console.log(`Already processed: ${Object.keys(manifest.items).length} success, ${Object.keys(manifest.failures).length} failed`);

    const toProcess = unsplashArticles.slice(0, options.limit);
    console.log(`Processing: ${toProcess.length}\n`);

    const counters = {
        updated: 0,
        skipped: 0,
        noUrl: 0,
        noImage: 0,
        pageError: 0,
        errors: 0,
    };

    let sinceLastSave = 0;

    for (let i = 0; i < toProcess.length; i++) {
        // Rate limit
        if (i > 0) {
            await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
        }

        const result = await processArticle(toProcess[i], bucket, manifest, options);

        switch (result.status) {
            case "updated":
            case "would-update":
                counters.updated++;
                sinceLastSave++;
                break;
            case "skipped":
                counters.skipped++;
                break;
            case "no-url":
                counters.noUrl++;
                break;
            case "no-image":
                counters.noImage++;
                sinceLastSave++;
                break;
            case "page-error":
                counters.pageError++;
                sinceLastSave++;
                break;
            case "error":
                counters.errors++;
                sinceLastSave++;
                break;
        }

        // Save manifest periodically
        if (!options.dryRun && sinceLastSave >= SAVE_INTERVAL) {
            saveManifest(manifest);
            sinceLastSave = 0;
        }

        // Progress
        if ((i + 1) % 100 === 0 || i + 1 === toProcess.length) {
            console.log(`Progress: ${i + 1}/${toProcess.length} | updated: ${counters.updated}, skipped: ${counters.skipped}, no-image: ${counters.noImage}, errors: ${counters.errors + counters.pageError}`);
        }
    }

    if (!options.dryRun) {
        saveManifest(manifest);
    }

    console.log("\n--- Summary ---");
    console.log(JSON.stringify(counters, null, 2));
    console.log(`\nManifest: ${Object.keys(manifest.items).length} scraped, ${Object.keys(manifest.failures).length} failures`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
