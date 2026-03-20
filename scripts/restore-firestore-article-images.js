const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { normalizeUrl, resolveRetiredImageCandidates, buildAttachmentMap: buildAttachmentMapFromUtils } = require("./wp-image-utils");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BACKUP_DIR = path.resolve(__dirname, "../backup_data");
const POSTS_PATH = path.join(BACKUP_DIR, "posts.jsonl");
const POSTMETA_PATH = path.join(BACKUP_DIR, "postmeta.jsonl");
const ATTACHMENTS_PATH = path.join(BACKUP_DIR, "attachments.jsonl");
const MANIFEST_PATH = path.join(BACKUP_DIR, "restored_article_images_manifest.json");
const IMG_TAG_REGEX = /<img\b[^>]*>/gi;
const SRC_ATTR_REGEX = /\ssrc=(["'])([^"']+)\1/i;
const HTTP_TIMEOUT_MS = 30000;
const PRIMARY_HOST = "technologyreview.es";
const RETIRED_HOSTS = new Set([
    "437.6e6.mytemp.website",
    "www.technologyreview.es",
    "pretr.opinnosites.com",
]);

function parseArgs(argv) {
    const args = {
        dryRun: argv.includes("--dry-run"),
        limit: Infinity,
        docIds: [],
        assetRoots: [],
    };

    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    if (limitArg) {
        const parsed = Number.parseInt(limitArg.split("=")[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            args.limit = parsed;
        }
    }

    for (const arg of argv) {
        if (arg.startsWith("--doc-id=")) {
            const value = arg.split("=")[1];
            if (value) {
                args.docIds.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
            }
        }

        if (arg.startsWith("--asset-root=")) {
            const value = arg.split("=")[1];
            if (value) {
                args.assetRoots.push(value);
            }
        }
    }

    return args;
}

function readJsonLines(filePath) {
    return fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function getServiceAccount() {
    const rawKey = process.env.ADMIN_SDK_KEY;
    if (!rawKey) {
        throw new Error("ADMIN_SDK_KEY no configurada en .env.local");
    }

    try {
        return JSON.parse(rawKey);
    } catch {
        return JSON.parse(Buffer.from(rawKey, "base64").toString("utf8"));
    }
}

function ensureFirebase() {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    return admin.initializeApp({
        credential: admin.credential.cert(getServiceAccount()),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

function loadManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return {
            version: 1,
            items: {},
        };
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    return {
        version: manifest.version || 1,
        items: manifest.items || {},
    };
}

function saveManifest(manifest) {
    const nextManifest = {
        ...manifest,
        generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2));
}

function buildPublicBucketUrl(bucketName, objectPath) {
    return `https://storage.googleapis.com/${bucketName}/${String(objectPath).split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

function indexBy(items, keyName) {
    const map = new Map();
    for (const item of items) {
        map.set(String(item[keyName]), item);
    }
    return map;
}

function groupBy(items, keyName) {
    const map = new Map();
    for (const item of items) {
        const key = String(item[keyName]);
        const bucket = map.get(key) || [];
        bucket.push(item);
        map.set(key, bucket);
    }
    return map;
}

function extractImageUrlsFromHtml(html) {
    if (!html || typeof html !== "string") return [];

    const urls = [];
    const seen = new Set();

    for (const tag of html.match(IMG_TAG_REGEX) || []) {
        const srcMatch = tag.match(SRC_ATTR_REGEX);
        if (!srcMatch) continue;

        const normalized = normalizeUrl(srcMatch[2]);
        if (!normalized || seen.has(normalized)) continue;

        seen.add(normalized);
        urls.push(normalized);
    }

    return urls;
}

function replaceImageUrlsInHtml(html, replacements) {
    if (!html || typeof html !== "string" || replacements.size === 0) {
        return html;
    }

    return html.replace(IMG_TAG_REGEX, (tag) => {
        const srcMatch = tag.match(SRC_ATTR_REGEX);
        if (!srcMatch) return tag;

        const originalSrc = srcMatch[2];
        const normalizedSrc = normalizeUrl(originalSrc);
        const nextSrc = replacements.get(originalSrc) || (normalizedSrc ? replacements.get(normalizedSrc) : null);
        if (!nextSrc) return tag;

        let nextTag = tag.replace(SRC_ATTR_REGEX, ` src=${srcMatch[1]}${nextSrc}${srcMatch[1]}`);
        nextTag = nextTag.replace(/\s(?:srcset|sizes)=(["']).*?\1/gi, "");
        return nextTag;
    });
}

function inferContentTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    if (ext === ".avif") return "image/avif";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".jpeg" || ext === ".jpg") return "image/jpeg";
    return "application/octet-stream";
}

function getAssetRoots(options) {
    const envRoots = String(process.env.WORDPRESS_ASSET_ROOTS || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const roots = [...options.assetRoots, ...envRoots]
        .map((item) => path.resolve(item))
        .filter((item, index, arr) => arr.indexOf(item) === index);

    return roots.filter((rootPath) => fs.existsSync(rootPath));
}

function getLocalFileCandidates(sourceUrl, assetRoots) {
    if (assetRoots.length === 0) return [];

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(sourceUrl).pathname);
    } catch {
        return [];
    }

    const trimmedPathname = pathname.replace(/^\/+/, "");
    const basename = path.basename(pathname);
    const candidates = [];

    const addCandidate = (candidatePath) => {
        if (!candidatePath) return;
        const resolved = path.resolve(candidatePath);
        if (!candidates.includes(resolved)) {
            candidates.push(resolved);
        }
    };

    for (const root of assetRoots) {
        addCandidate(path.join(root, trimmedPathname));

        const uploadsIndex = trimmedPathname.indexOf("wp-content/uploads/");
        if (uploadsIndex >= 0) {
            const uploadsRelative = trimmedPathname.slice(uploadsIndex + "wp-content/uploads/".length);
            addCandidate(path.join(root, "wp-content/uploads", uploadsRelative));
            addCandidate(path.join(root, uploadsRelative));
        }

        const filesIndex = trimmedPathname.indexOf("files/");
        if (filesIndex >= 0) {
            const filesRelative = trimmedPathname.slice(filesIndex);
            addCandidate(path.join(root, filesRelative));
            addCandidate(path.join(root, filesRelative.replace(/^files\//, "")));
        }

        addCandidate(path.join(root, basename));
    }

    return candidates;
}

function isNumericId(value) {
    return typeof value === "string" && /^\d+$/.test(value);
}

function getBackupPostForArticle(docId, data, postsById) {
    const candidates = [];

    if (typeof data.originalId === "string" || typeof data.originalId === "number") {
        candidates.push(String(data.originalId));
    }
    candidates.push(String(docId));

    for (const candidate of candidates) {
        if (!isNumericId(candidate)) continue;
        const post = postsById.get(candidate);
        if (post) return post;
    }

    return null;
}

function dedupeUrls(urls) {
    const seen = new Set();
    const nextUrls = [];

    for (const value of urls) {
        const normalized = normalizeUrl(value);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        nextUrls.push(normalized);
    }

    return nextUrls;
}

function getAttachmentUrl(attachment) {
    if (!attachment) return null;
    return normalizeUrl(attachment.guid);
}

function getArticleImageUrls(post, postMetaByPostId, attachmentsById, attachmentsByParentId) {
    const urls = [];
    const metas = postMetaByPostId.get(String(post.ID)) || [];

    for (const meta of metas) {
        if (meta.meta_key !== "_thumbnail_id") continue;
        const attachment = attachmentsById.get(String(meta.meta_value));
        const attachmentUrl = getAttachmentUrl(attachment);
        if (attachmentUrl) {
            urls.push(attachmentUrl);
        }
    }

    const childAttachments = attachmentsByParentId.get(String(post.ID)) || [];
    for (const attachment of childAttachments) {
        if (!String(attachment.post_mime_type || "").startsWith("image/")) continue;
        const attachmentUrl = getAttachmentUrl(attachment);
        if (attachmentUrl) {
            urls.push(attachmentUrl);
        }
    }

    urls.push(...extractImageUrlsFromHtml(post.post_content || ""));

    return dedupeUrls(urls);
}

async function fetchWithTimeout(url, timeoutMs = HTTP_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

function inferExtension(sourceUrl, contentType) {
    try {
        const pathname = new URL(sourceUrl).pathname;
        const ext = path.extname(pathname);
        if (ext) return ext.toLowerCase();
    } catch {
        // Ignore and fall back to content type.
    }

    if (contentType === "image/png") return ".png";
    if (contentType === "image/webp") return ".webp";
    if (contentType === "image/gif") return ".gif";
    if (contentType === "image/avif") return ".avif";
    if (contentType === "image/svg+xml") return ".svg";
    return ".jpg";
}

function buildDownloadCandidateUrls(sourceUrl) {
    const candidates = [sourceUrl];
    try {
        const parsed = new URL(sourceUrl);
        if (RETIRED_HOSTS.has(parsed.hostname)) {
            const substituted = new URL(sourceUrl);
            substituted.hostname = PRIMARY_HOST;
            const sub = substituted.toString();
            if (!candidates.includes(sub)) {
                candidates.unshift(sub); // Try primary host first
            }
        }
    } catch {
        // Ignore parse errors.
    }
    return candidates;
}

async function downloadImage(sourceUrl, assetRoots) {
    for (const candidatePath of getLocalFileCandidates(sourceUrl, assetRoots)) {
        if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
            continue;
        }

        const buffer = fs.readFileSync(candidatePath);
        return {
            buffer,
            contentType: inferContentTypeFromPath(candidatePath),
        };
    }

    const candidateUrls = buildDownloadCandidateUrls(sourceUrl);
    const errors = [];

    for (const candidateUrl of candidateUrls) {
        try {
            const response = await fetchWithTimeout(candidateUrl);
            if (!response.ok) {
                errors.push(`${candidateUrl} -> HTTP ${response.status}`);
                continue;
            }

            const contentType = response.headers.get("content-type") || "application/octet-stream";
            if (!contentType.startsWith("image/")) {
                errors.push(`${candidateUrl} -> content-type inesperado (${contentType})`);
                continue;
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            return { buffer, contentType };
        } catch (error) {
            errors.push(`${candidateUrl} -> ${error.message}`);
        }
    }

    throw new Error(errors.join(" | "));
}

async function uploadToStorage(bucket, articleId, sourceUrl, buffer, contentType) {
    const extension = inferExtension(sourceUrl, contentType);
    const sourceHash = crypto.createHash("sha1").update(sourceUrl).digest("hex");
    const objectPath = `restored/articles/${articleId}/${sourceHash}${extension}`;
    await bucket.file(objectPath).save(buffer, {
        resumable: false,
        contentType,
        metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: {
                mirroredFrom: sourceUrl,
                articleId: String(articleId),
            },
        },
    });
    await bucket.file(objectPath).makePublic();

    return {
        objectPath,
        publicUrl: buildPublicBucketUrl(bucket.name, objectPath),
    };
}

async function mirrorImage(bucket, manifest, articleId, sourceUrl, dryRun, assetRoots) {
    const normalizedSourceUrl = normalizeUrl(sourceUrl);
    if (!normalizedSourceUrl) return null;

    const manifestHit = manifest.items[normalizedSourceUrl];
    if (manifestHit?.objectPath) {
        return buildPublicBucketUrl(bucket.name, manifestHit.objectPath);
    }

    if (dryRun) {
        return normalizedSourceUrl;
    }

    const downloaded = await downloadImage(normalizedSourceUrl, assetRoots);
    const uploaded = await uploadToStorage(
        bucket,
        articleId,
        normalizedSourceUrl,
        downloaded.buffer,
        downloaded.contentType
    );

    manifest.items[normalizedSourceUrl] = {
        articleId: String(articleId),
        objectPath: uploaded.objectPath,
        publicUrl: uploaded.publicUrl,
        contentType: downloaded.contentType,
        mirroredAt: new Date().toISOString(),
    };
    saveManifest(manifest);

    return uploaded.publicUrl;
}

function hasWorkingImage(data) {
    const imageUrl = data.imageUrl || "";
    if (!imageUrl) return false;
    if (imageUrl.includes("images.unsplash.com")) return false;
    // Already has a storage or firebase URL
    if (imageUrl.includes("storage.googleapis.com") || imageUrl.includes("firebasestorage.googleapis.com")) return true;
    // Has a non-fallback image
    return true;
}

async function processArticle(docSnap, context) {
    const { bucket, manifest, postsById, postMetaByPostId, attachmentsById, attachmentsByParentId, options, counters, assetRoots } = context;
    const data = docSnap.data() || {};
    const post = getBackupPostForArticle(docSnap.id, data, postsById);

    counters.docsScanned += 1;

    // Skip articles that already have working images
    if (hasWorkingImage(data)) {
        counters.docsAlreadyRestored += 1;
        return;
    }

    if (!post) {
        counters.docsWithoutBackup += 1;
        return;
    }

    const sourceUrls = getArticleImageUrls(post, postMetaByPostId, attachmentsById, attachmentsByParentId);
    if (sourceUrls.length === 0) {
        counters.docsWithoutImages += 1;
        return;
    }

    const replacements = new Map();
    const mirroredUrls = [];

    for (const sourceUrl of sourceUrls) {
        try {
            const mirroredUrl = await mirrorImage(bucket, manifest, docSnap.id, sourceUrl, options.dryRun, assetRoots);
            if (!mirroredUrl) continue;

            replacements.set(sourceUrl, mirroredUrl);
            mirroredUrls.push(mirroredUrl);
            counters.imagesMirrored += 1;
        } catch (error) {
            counters.imageFailures += 1;
            console.error(`Failed to mirror ${docSnap.id} -> ${sourceUrl} -> ${error.message}`);
        }
    }

    if (mirroredUrls.length === 0) {
        counters.docsWithoutSuccessfulImages += 1;
        return;
    }

    const currentContent = typeof data.content === "string" ? data.content : "";
    const nextContent = replaceImageUrlsInHtml(currentContent, replacements);
    const nextImageUrl = mirroredUrls[0];
    const updates = {
        imageUrl: nextImageUrl,
        content: nextContent,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        assetRestore: {
            lastRestoredAt: admin.firestore.FieldValue.serverTimestamp(),
            imageCount: mirroredUrls.length,
            sourcePostId: String(post.ID),
        },
    };

    counters.docsUpdated += 1;
    console.log(`Updating ${docSnap.id} (${mirroredUrls.length} mirrored images)`);

    if (!options.dryRun) {
        await docSnap.ref.set(updates, { merge: true });
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    const posts = readJsonLines(POSTS_PATH).filter((post) => post.post_type === "post");
    const postMeta = readJsonLines(POSTMETA_PATH);
    const attachments = readJsonLines(ATTACHMENTS_PATH).filter((item) => item.post_type === "attachment");

    const postsById = indexBy(posts, "ID");
    const postMetaByPostId = groupBy(postMeta, "post_id");
    const attachmentsById = indexBy(attachments, "ID");
    const attachmentsByParentId = groupBy(attachments, "post_parent");
    const manifest = loadManifest();
    const assetRoots = getAssetRoots(options);

    const counters = {
        docsScanned: 0,
        docsUpdated: 0,
        docsAlreadyRestored: 0,
        docsWithoutBackup: 0,
        docsWithoutImages: 0,
        docsWithoutSuccessfulImages: 0,
        imagesMirrored: 0,
        imageFailures: 0,
    };

    console.log(`Starting article image restore${options.dryRun ? " (dry run)" : ""}...`);
    console.log(`Posts indexed: ${postsById.size}`);
    console.log(`Attachments indexed: ${attachmentsById.size}`);
    console.log(`Local asset roots: ${assetRoots.length > 0 ? assetRoots.join(", ") : "none"}`);
    console.log(`Storage bucket: ${bucket.name}`);

    let snapshot;
    if (options.docIds.length > 0) {
        const refs = options.docIds.map((id) => db.collection("articles").doc(id));
        const docs = await db.getAll(...refs);
        snapshot = { docs: docs.filter((doc) => doc.exists) };
    } else {
        snapshot = await db.collection("articles").get();
    }

    const context = {
        bucket,
        manifest,
        postsById,
        postMetaByPostId,
        attachmentsById,
        attachmentsByParentId,
        assetRoots,
        options,
        counters,
    };

    const totalDocs = snapshot.docs.length;
    for (let i = 0; i < totalDocs; i++) {
        if (counters.docsUpdated >= options.limit) {
            break;
        }
        await processArticle(snapshot.docs[i], context);

        if ((i + 1) % 200 === 0 || i + 1 === totalDocs) {
            console.log(`Progress: ${i + 1}/${totalDocs} scanned, ${counters.docsUpdated} updated, ${counters.imageFailures} failures, ${counters.docsAlreadyRestored} already OK`);
        }
    }

    if (!options.dryRun) {
        saveManifest(manifest);
    }

    console.log("Done.");
    console.log(JSON.stringify(counters, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
