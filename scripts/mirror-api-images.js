/**
 * mirror-api-images.js
 *
 * One-time migration: download images from wp.technologyreview.com
 * for all API-imported articles (source: "MIT TR US") and upload
 * them to Firebase Storage, then update Firestore.
 *
 * Usage:
 *   node scripts/mirror-api-images.js              # full run
 *   node scripts/mirror-api-images.js --dry-run    # preview only
 *   node scripts/mirror-api-images.js --limit=10   # process first 10
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

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
    if (admin.apps.length > 0) return admin.app();
    return admin.initializeApp({
        credential: admin.credential.cert(getServiceAccount()),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

function parseArgs(argv) {
    const args = { dryRun: argv.includes("--dry-run"), limit: Infinity };
    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    if (limitArg) {
        const parsed = Number.parseInt(limitArg.split("=")[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed;
    }
    return args;
}

function buildPublicUrl(bucketName, objectPath) {
    return `https://storage.googleapis.com/${bucketName}/${objectPath.split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

function inferExtension(sourceUrl, contentType) {
    try {
        const ext = path.extname(new URL(sourceUrl).pathname);
        if (ext) return ext.toLowerCase();
    } catch { /* ignore */ }
    if (contentType === "image/png") return ".png";
    if (contentType === "image/webp") return ".webp";
    if (contentType === "image/gif") return ".gif";
    return ".jpg";
}

function isExternalImageUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
        const parsed = new URL(url);
        return (
            parsed.hostname !== "firebasestorage.googleapis.com" &&
            parsed.hostname !== "storage.googleapis.com" &&
            parsed.protocol.startsWith("http")
        );
    } catch {
        return false;
    }
}

function stripResizeParams(url) {
    try {
        const parsed = new URL(url);
        for (const param of ["w", "h", "width", "height", "crop", "resize", "fit"]) {
            parsed.searchParams.delete(param);
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

async function mirrorImage(imageUrl, bucket, dryRun) {
    if (!isExternalImageUrl(imageUrl)) return null;

    // Strip resize params to get full-size image
    const cleanUrl = stripResizeParams(imageUrl);
    const urlHash = crypto.createHash("sha1").update(cleanUrl).digest("hex");
    const ext = inferExtension(cleanUrl, null);
    const objectPath = `imported/articles/${urlHash}${ext}`;
    const file = bucket.file(objectPath);

    // Check if already mirrored at full size
    const [exists] = await file.exists();
    if (exists) {
        return buildPublicUrl(bucket.name, objectPath);
    }

    if (dryRun) {
        return `[dry-run] would mirror -> ${objectPath}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(cleanUrl, {
            redirect: "follow",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
            throw new Error(`Not an image: ${contentType}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        await file.save(buffer, {
            resumable: false,
            contentType,
            metadata: {
                cacheControl: "public,max-age=31536000,immutable",
                metadata: { mirroredFrom: cleanUrl },
            },
        });
        await file.makePublic();

        return buildPublicUrl(bucket.name, objectPath);
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Re-download an image already in Firebase Storage if it was stored at thumbnail size.
 * Reads the mirroredFrom metadata, strips resize params, re-downloads full-size.
 */
async function upgradeStorageImage(storageUrl, bucket, dryRun) {
    if (!storageUrl || typeof storageUrl !== "string") return null;
    try {
        const parsed = new URL(storageUrl);
        if (parsed.hostname !== "storage.googleapis.com") return null;

        // Extract the object path from the URL
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        // URL format: /bucketName/path/to/file
        const bucketName = pathParts[0];
        const objectPath = pathParts.slice(1).map(decodeURIComponent).join("/");
        const file = bucket.file(objectPath);

        const [exists] = await file.exists();
        if (!exists) return null;

        const [metadata] = await file.getMetadata();
        const size = parseInt(metadata.size, 10);

        // Only re-download if image is suspiciously small (< 50KB = likely thumbnail)
        if (size > 50000) return null;

        const mirroredFrom = metadata.metadata?.mirroredFrom;
        if (!mirroredFrom) return null;

        // Strip resize params from the original source URL
        const cleanUrl = stripResizeParams(mirroredFrom);
        if (cleanUrl === mirroredFrom) {
            // No resize params found — the source was already full-size, image is just small
            return null;
        }

        // New hash from clean URL = new storage path
        const urlHash = crypto.createHash("sha1").update(cleanUrl).digest("hex");
        const ext = inferExtension(cleanUrl, null);
        const newObjectPath = `imported/articles/${urlHash}${ext}`;
        const newFile = bucket.file(newObjectPath);

        const [newExists] = await newFile.exists();
        if (newExists) {
            return buildPublicUrl(bucket.name, newObjectPath);
        }

        if (dryRun) {
            return `[dry-run] would re-download full-size: ${cleanUrl} (was ${size} bytes)`;
        }

        console.log(`  Re-downloading full-size: ${cleanUrl} (was ${size} bytes)`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(cleanUrl, {
                redirect: "follow",
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const contentType = response.headers.get("content-type") || "image/jpeg";
            const buffer = Buffer.from(await response.arrayBuffer());

            await newFile.save(buffer, {
                resumable: false,
                contentType,
                metadata: {
                    cacheControl: "public,max-age=31536000,immutable",
                    metadata: { mirroredFrom: cleanUrl },
                },
            });
            await newFile.makePublic();

            return buildPublicUrl(bucket.name, newObjectPath);
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        console.error(`  Failed to upgrade image: ${error.message}`);
        return null;
    }
}

function extractImageUrlsFromHtml(html) {
    if (!html || typeof html !== "string") return [];
    const imgRegex = /src=["'](https?:\/\/[^"']+)["']/g;
    const urls = new Set();
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        if (isExternalImageUrl(match[1])) {
            urls.add(match[1]);
        }
    }
    return [...urls];
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    console.log(`\n=== Mirror API-Imported Article Images ===`);
    console.log(`Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`Limit: ${options.limit === Infinity ? "unlimited" : options.limit}`);
    console.log(`Bucket: ${bucket.name}\n`);

    const counters = {
        scanned: 0,
        updated: 0,
        imagesMirrored: 0,
        contentImagesMirrored: 0,
        failed: 0,
        skipped: 0,
    };

    // Query all MIT TR US articles with external imageUrls
    const PAGE_SIZE = 100;
    let lastDoc = null;

    while (counters.updated < options.limit) {
        let query = db.collection("articles")
            .where("source", "==", "MIT TR US")
            .orderBy("__name__")
            .limit(PAGE_SIZE);

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        console.log(`Processing batch of ${snapshot.size} articles...`);

        for (const docSnap of snapshot.docs) {
            if (counters.updated >= options.limit) break;

            counters.scanned++;
            const data = docSnap.data();
            const updates = {};
            let changed = false;

            // 1. Mirror the main imageUrl (external) or upgrade (small Firebase Storage)
            if (isExternalImageUrl(data.imageUrl)) {
                try {
                    const mirrored = await mirrorImage(data.imageUrl, bucket, options.dryRun);
                    if (mirrored && mirrored !== data.imageUrl && !mirrored.startsWith("[dry-run]")) {
                        updates.imageUrl = mirrored;
                        changed = true;
                        counters.imagesMirrored++;
                    } else if (mirrored && mirrored.startsWith("[dry-run]")) {
                        counters.imagesMirrored++;
                        changed = true;
                    }
                } catch (error) {
                    counters.failed++;
                    console.error(`  FAIL ${docSnap.id} imageUrl: ${error.message}`);
                }
            } else if (data.imageUrl && data.imageUrl.includes("storage.googleapis.com")) {
                // Check if existing Firebase Storage image is a thumbnail that needs upgrading
                try {
                    const upgraded = await upgradeStorageImage(data.imageUrl, bucket, options.dryRun);
                    if (upgraded && upgraded !== data.imageUrl && !upgraded.startsWith("[dry-run]")) {
                        updates.imageUrl = upgraded;
                        changed = true;
                        counters.imagesMirrored++;
                    } else if (upgraded && upgraded.startsWith("[dry-run]")) {
                        counters.imagesMirrored++;
                        changed = true;
                    }
                } catch (error) {
                    counters.failed++;
                    console.error(`  FAIL ${docSnap.id} upgrade: ${error.message}`);
                }
            }

            // 2. Mirror images in content HTML
            if (data.content) {
                const externalUrls = extractImageUrlsFromHtml(data.content);
                if (externalUrls.length > 0) {
                    let updatedContent = data.content;
                    for (const url of externalUrls) {
                        try {
                            const mirrored = await mirrorImage(url, bucket, options.dryRun);
                            if (mirrored && mirrored !== url && !mirrored.startsWith("[dry-run]")) {
                                updatedContent = updatedContent.split(url).join(mirrored);
                                counters.contentImagesMirrored++;
                            } else if (mirrored && mirrored.startsWith("[dry-run]")) {
                                counters.contentImagesMirrored++;
                            }
                        } catch (error) {
                            counters.failed++;
                            console.error(`  FAIL ${docSnap.id} content image: ${error.message}`);
                        }
                    }
                    if (updatedContent !== data.content) {
                        updates.content = updatedContent;
                        changed = true;
                    }
                }
            }

            if (!changed) {
                counters.skipped++;
                continue;
            }

            counters.updated++;

            if (options.dryRun) {
                console.log(`  [dry-run] Would update: ${docSnap.id} (${data.title?.slice(0, 60)}...)`);
            } else {
                await docSnap.ref.set({
                    ...updates,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    assetMirror: {
                        lastMirroredAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                }, { merge: true });
                console.log(`  Updated: ${docSnap.id}`);
            }
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    console.log("\n========================================");
    console.log("          RESULTS SUMMARY");
    console.log("========================================\n");
    console.log(`Articles scanned:           ${counters.scanned}`);
    console.log(`Articles updated:           ${counters.updated}`);
    console.log(`Featured images mirrored:   ${counters.imagesMirrored}`);
    console.log(`Content images mirrored:    ${counters.contentImagesMirrored}`);
    console.log(`Skipped (already migrated): ${counters.skipped}`);
    console.log(`Failed:                     ${counters.failed}`);
    console.log();
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
