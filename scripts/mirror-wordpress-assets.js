const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
    buildAttachmentMap,
    extractRetiredImageUrlsFromHtml,
    loadMirroredManifest,
    normalizeUrl,
    replaceRetiredImageUrlsInHtml,
    resolveRetiredImageCandidates,
} = require("./wp-image-utils");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BACKUP_DIR = path.resolve(__dirname, "../backup_data");
const MANIFEST_PATH = path.join(BACKUP_DIR, "mirrored_images.json");
const COLLECTIONS = [
    { name: "articles", imageFields: ["imageUrl"], htmlFields: ["content"] },
    { name: "pages", imageFields: ["headerImageUrl"], htmlFields: ["content"] },
    { name: "informes", imageFields: ["imageUrl"], htmlFields: [] },
];

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

function saveManifest(manifest) {
    const nextManifest = {
        ...manifest,
        generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(nextManifest, null, 2));
}

function buildDownloadUrl(bucketName, objectPath, token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

function inferExtension(sourceUrl, contentType) {
    const normalizedUrl = normalizeUrl(sourceUrl);
    if (normalizedUrl) {
        const pathname = new URL(normalizedUrl).pathname;
        const ext = path.extname(pathname);
        if (ext) return ext.toLowerCase();
    }

    if (contentType === "image/png") return ".png";
    if (contentType === "image/webp") return ".webp";
    if (contentType === "image/gif") return ".gif";
    if (contentType === "image/avif") return ".avif";
    return ".jpg";
}

async function fetchWithTimeout(url, timeoutMs = 30000) {
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

async function downloadFirstAvailableImage(candidateUrls) {
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
            return {
                sourceUrl: candidateUrl,
                contentType,
                buffer,
            };
        } catch (error) {
            errors.push(`${candidateUrl} -> ${error.message}`);
        }
    }

    throw new Error(errors.join(" | "));
}

async function uploadToStorage(bucket, sourceUrl, buffer, contentType) {
    const extension = inferExtension(sourceUrl, contentType);
    const sourceHash = crypto.createHash("sha1").update(sourceUrl).digest("hex");
    const objectPath = `mirrored/legacy-assets/${sourceHash}${extension}`;
    const downloadToken = crypto.randomUUID();

    await bucket.file(objectPath).save(buffer, {
        resumable: false,
        contentType,
        metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: {
                firebaseStorageDownloadTokens: downloadToken,
                mirroredFrom: sourceUrl,
            },
        },
    });

    return {
        objectPath,
        downloadUrl: buildDownloadUrl(bucket.name, objectPath, downloadToken),
    };
}

function getManifestDownloadUrl(manifest, originalUrl, candidateUrls) {
    if (manifest.aliases[originalUrl] && manifest.items[manifest.aliases[originalUrl]]?.downloadUrl) {
        return {
            sourceUrl: manifest.aliases[originalUrl],
            downloadUrl: manifest.items[manifest.aliases[originalUrl]].downloadUrl,
        };
    }

    for (const candidateUrl of candidateUrls) {
        if (manifest.items[candidateUrl]?.downloadUrl) {
            return {
                sourceUrl: candidateUrl,
                downloadUrl: manifest.items[candidateUrl].downloadUrl,
            };
        }
    }

    return null;
}

async function mirrorAsset(originalUrl, attachmentById, manifest, bucket, dryRun) {
    const normalizedOriginalUrl = normalizeUrl(originalUrl);
    if (!normalizedOriginalUrl) return null;

    const candidateUrls = resolveRetiredImageCandidates(normalizedOriginalUrl, attachmentById);
    if (candidateUrls.length === 0) return null;

    const manifestHit = getManifestDownloadUrl(manifest, normalizedOriginalUrl, candidateUrls);
    if (manifestHit) {
        manifest.aliases[normalizedOriginalUrl] = manifestHit.sourceUrl;
        return manifestHit.downloadUrl;
    }

    if (dryRun) {
        return candidateUrls[0];
    }

    let downloaded;
    try {
        downloaded = await downloadFirstAvailableImage(candidateUrls);
    } catch (error) {
        manifest.failures[normalizedOriginalUrl] = {
            candidates: candidateUrls,
            error: error.message,
            failedAt: new Date().toISOString(),
        };
        saveManifest(manifest);
        throw error;
    }

    const uploaded = await uploadToStorage(bucket, downloaded.sourceUrl, downloaded.buffer, downloaded.contentType);

    manifest.items[downloaded.sourceUrl] = {
        downloadUrl: uploaded.downloadUrl,
        objectPath: uploaded.objectPath,
        contentType: downloaded.contentType,
        mirroredAt: new Date().toISOString(),
    };
    manifest.aliases[normalizedOriginalUrl] = downloaded.sourceUrl;
    for (const candidateUrl of candidateUrls) {
        manifest.aliases[candidateUrl] = downloaded.sourceUrl;
    }
    delete manifest.failures[normalizedOriginalUrl];
    saveManifest(manifest);

    return uploaded.downloadUrl;
}

async function processCollection(db, bucket, collectionConfig, attachmentById, manifest, options, counters) {
    const snapshot = await db.collection(collectionConfig.name).get();
    console.log(`Collection ${collectionConfig.name}: ${snapshot.size} documents`);

    for (const docSnap of snapshot.docs) {
        if (counters.docsUpdated >= options.limit) {
            return;
        }

        const data = docSnap.data() || {};
        const updates = {};
        let changed = false;
        let mirroredInDoc = 0;

        for (const fieldName of collectionConfig.imageFields) {
            const fieldValue = data[fieldName];
            if (typeof fieldValue !== "string") continue;

            let mirroredUrl = null;
            try {
                mirroredUrl = await mirrorAsset(fieldValue, attachmentById, manifest, bucket, options.dryRun);
            } catch (error) {
                counters.assetFailures += 1;
                console.error(`Failed to mirror ${collectionConfig.name}/${docSnap.id}:${fieldName} -> ${error.message}`);
                continue;
            }

            if (mirroredUrl && mirroredUrl !== fieldValue) {
                updates[fieldName] = mirroredUrl;
                changed = true;
                mirroredInDoc += 1;
            }
        }

        for (const fieldName of collectionConfig.htmlFields) {
            const htmlValue = data[fieldName];
            if (typeof htmlValue !== "string" || !htmlValue) continue;

            const retiredUrls = extractRetiredImageUrlsFromHtml(htmlValue, attachmentById);
            if (retiredUrls.length === 0) continue;

            const replacements = new Map();
            for (const retiredUrl of retiredUrls) {
                let mirroredUrl = null;
                try {
                    mirroredUrl = await mirrorAsset(retiredUrl, attachmentById, manifest, bucket, options.dryRun);
                } catch (error) {
                    counters.assetFailures += 1;
                    console.error(`Failed to mirror ${collectionConfig.name}/${docSnap.id}:${fieldName} -> ${error.message}`);
                    continue;
                }

                if (mirroredUrl && mirroredUrl !== retiredUrl) {
                    replacements.set(retiredUrl, mirroredUrl);
                    const normalizedRetiredUrl = normalizeUrl(retiredUrl);
                    if (normalizedRetiredUrl) {
                        replacements.set(normalizedRetiredUrl, mirroredUrl);
                    }
                    mirroredInDoc += 1;
                }
            }

            if (replacements.size > 0) {
                updates[fieldName] = replaceRetiredImageUrlsInHtml(htmlValue, replacements, attachmentById);
                changed = true;
            }
        }

        if (!changed) {
            counters.docsScanned += 1;
            continue;
        }

        counters.docsScanned += 1;
        counters.docsUpdated += 1;
        counters.assetsMirrored += mirroredInDoc;

        console.log(`Updating ${collectionConfig.name}/${docSnap.id} (${mirroredInDoc} assets)`);

        if (!options.dryRun) {
            await docSnap.ref.set({
                ...updates,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                assetMirror: {
                    lastMirroredAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            }, { merge: true });
        }
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const attachmentById = buildAttachmentMap(BACKUP_DIR);
    const manifest = loadMirroredManifest(MANIFEST_PATH);
    const counters = {
        assetFailures: 0,
        docsScanned: 0,
        docsUpdated: 0,
        assetsMirrored: 0,
    };

    console.log(`Starting asset mirror${options.dryRun ? " (dry run)" : ""}...`);
    console.log(`Attachment map size: ${attachmentById.size}`);
    console.log(`Storage bucket: ${bucket.name}`);

    for (const collectionConfig of COLLECTIONS) {
        await processCollection(db, bucket, collectionConfig, attachmentById, manifest, options, counters);
        if (counters.docsUpdated >= options.limit) {
            break;
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
