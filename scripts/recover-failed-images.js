const admin = require("firebase-admin");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
    extractRetiredImageUrlsFromHtml,
    loadMirroredManifest,
    normalizeUrl,
    replaceRetiredImageUrlsInHtml,
    buildAttachmentMap,
} = require("./wp-image-utils");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const BACKUP_DIR = path.resolve(__dirname, "../backup_data");
const MANIFEST_PATH = path.join(BACKUP_DIR, "mirrored_images.json");
const PRIMARY_HOST = "technologyreview.es";
const WAYBACK_API_URL = "https://archive.org/wayback/available";
const WAYBACK_RATE_LIMIT_MS = 1100;
const MAX_CONCURRENCY = 5;
const SAVE_INTERVAL = 50;

const COLLECTIONS = [
    { name: "articles", imageFields: ["imageUrl"], htmlFields: ["content"] },
    { name: "pages", imageFields: ["headerImageUrl"], htmlFields: ["content"] },
    { name: "informes", imageFields: ["imageUrl"], htmlFields: [] },
];

function parseArgs(argv) {
    const args = {
        dryRun: argv.includes("--dry-run"),
        skipWayback: argv.includes("--skip-wayback"),
        skipFirestoreUpdate: argv.includes("--skip-firestore-update"),
        limit: Infinity,
        host: null,
    };

    const limitArg = argv.find((arg) => arg.startsWith("--limit="));
    if (limitArg) {
        const parsed = Number.parseInt(limitArg.split("=")[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            args.limit = parsed;
        }
    }

    const hostArg = argv.find((arg) => arg.startsWith("--host="));
    if (hostArg) {
        args.host = hostArg.split("=")[1];
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

function buildPublicBucketUrl(bucketName, objectPath) {
    return `https://storage.googleapis.com/${bucketName}/${String(objectPath).split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
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

async function downloadImage(candidateUrls) {
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
            return { sourceUrl: candidateUrl, contentType, buffer };
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
    await bucket.file(objectPath).save(buffer, {
        resumable: false,
        contentType,
        metadata: {
            cacheControl: "public,max-age=31536000,immutable",
            metadata: {
                mirroredFrom: sourceUrl,
            },
        },
    });
    await bucket.file(objectPath).makePublic();

    return {
        objectPath,
        publicUrl: buildPublicBucketUrl(bucket.name, objectPath),
    };
}

// --- Recovery candidate generation ---

function generateHostSubstitutionCandidates(failedUrl) {
    const candidates = [];

    try {
        const parsed = new URL(failedUrl);
        if (parsed.hostname !== PRIMARY_HOST) {
            const substituted = new URL(failedUrl);
            substituted.hostname = PRIMARY_HOST;
            const normalized = normalizeUrl(substituted.toString());
            if (normalized) candidates.push(normalized);
        }
    } catch {
        // Ignore parse errors.
    }

    return candidates;
}

let lastWaybackCall = 0;

async function queryWaybackMachine(originalUrl) {
    const now = Date.now();
    const elapsed = now - lastWaybackCall;
    if (elapsed < WAYBACK_RATE_LIMIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, WAYBACK_RATE_LIMIT_MS - elapsed));
    }
    lastWaybackCall = Date.now();

    try {
        const apiUrl = `${WAYBACK_API_URL}?url=${encodeURIComponent(originalUrl)}`;
        const response = await fetchWithTimeout(apiUrl, 15000);
        if (!response.ok) return null;

        const data = await response.json();
        const snapshot = data?.archived_snapshots?.closest;
        if (!snapshot?.available || snapshot.status !== "200") return null;

        // Use id_ modifier to get the raw file without Wayback wrapper
        const timestamp = snapshot.timestamp;
        return `https://web.archive.org/web/${timestamp}id_/${originalUrl}`;
    } catch {
        return null;
    }
}

async function generateWaybackCandidates(failedUrl, failureEntry) {
    const candidates = [];

    // Try the original failed URL on Wayback
    const waybackUrl = await queryWaybackMachine(failedUrl);
    if (waybackUrl) candidates.push(waybackUrl);

    // Also try the originally-attempted candidate URLs on Wayback
    const originalCandidates = failureEntry?.candidates || [];
    for (const candidate of originalCandidates) {
        if (candidate === failedUrl) continue;
        const candidateWayback = await queryWaybackMachine(candidate);
        if (candidateWayback) {
            candidates.push(candidateWayback);
            break; // One successful Wayback hit is enough
        }
    }

    return candidates;
}

// --- Main recovery logic ---

async function recoverSingleImage(failedUrl, failureEntry, bucket, manifest, options) {
    // Skip if already recovered (by a previous partial run)
    if (manifest.items[failedUrl]?.objectPath) {
        return { recovered: true, skipped: true };
    }

    // Phase 1: Host substitution candidates
    const hostCandidates = generateHostSubstitutionCandidates(failedUrl);

    if (hostCandidates.length > 0) {
        try {
            if (options.dryRun) {
                return { recovered: true, dryRun: true, candidate: hostCandidates[0] };
            }

            const downloaded = await downloadImage(hostCandidates);
            const uploaded = await uploadToStorage(bucket, downloaded.sourceUrl, downloaded.buffer, downloaded.contentType);

            manifest.items[downloaded.sourceUrl] = {
                downloadUrl: uploaded.publicUrl,
                objectPath: uploaded.objectPath,
                contentType: downloaded.contentType,
                mirroredAt: new Date().toISOString(),
            };
            manifest.aliases[failedUrl] = downloaded.sourceUrl;
            for (const candidate of (failureEntry?.candidates || [])) {
                manifest.aliases[candidate] = downloaded.sourceUrl;
            }
            delete manifest.failures[failedUrl];

            return { recovered: true, sourceUrl: downloaded.sourceUrl, publicUrl: uploaded.publicUrl };
        } catch {
            // Host substitution failed, fall through to Wayback
        }
    }

    // Phase 2: Wayback Machine (if not skipped)
    if (!options.skipWayback) {
        const waybackCandidates = await generateWaybackCandidates(failedUrl, failureEntry);

        if (waybackCandidates.length > 0) {
            try {
                if (options.dryRun) {
                    return { recovered: true, dryRun: true, candidate: waybackCandidates[0] };
                }

                const downloaded = await downloadImage(waybackCandidates);
                // Use the original failed URL as the source key (not the wayback URL)
                const uploaded = await uploadToStorage(bucket, failedUrl, downloaded.buffer, downloaded.contentType);

                manifest.items[failedUrl] = {
                    downloadUrl: uploaded.publicUrl,
                    objectPath: uploaded.objectPath,
                    contentType: downloaded.contentType,
                    mirroredAt: new Date().toISOString(),
                };
                for (const candidate of (failureEntry?.candidates || [])) {
                    manifest.aliases[candidate] = failedUrl;
                }
                delete manifest.failures[failedUrl];

                return { recovered: true, sourceUrl: downloaded.sourceUrl, publicUrl: uploaded.publicUrl, viaWayback: true };
            } catch {
                // Wayback also failed
            }
        }
    }

    return { recovered: false };
}

async function processInBatches(failureEntries, bucket, manifest, options) {
    const counters = {
        total: failureEntries.length,
        recovered: 0,
        recoveredViaHost: 0,
        recoveredViaWayback: 0,
        stillFailed: 0,
        skipped: 0,
    };

    let sinceLastSave = 0;

    for (let i = 0; i < failureEntries.length; i += MAX_CONCURRENCY) {
        const batch = failureEntries.slice(i, i + MAX_CONCURRENCY);

        const results = await Promise.allSettled(
            batch.map(([failedUrl, failureEntry]) =>
                recoverSingleImage(failedUrl, failureEntry, bucket, manifest, options)
                    .then((result) => ({ failedUrl, ...result }))
            )
        );

        for (const result of results) {
            if (result.status === "rejected") {
                counters.stillFailed += 1;
                continue;
            }

            const value = result.value;
            if (value.skipped) {
                counters.skipped += 1;
            } else if (value.recovered) {
                counters.recovered += 1;
                sinceLastSave += 1;
                if (value.viaWayback) {
                    counters.recoveredViaWayback += 1;
                } else {
                    counters.recoveredViaHost += 1;
                }
                if (!options.dryRun) {
                    console.log(`  ✓ ${value.failedUrl} -> ${value.publicUrl || value.candidate}`);
                }
            } else {
                counters.stillFailed += 1;
            }
        }

        // Save manifest periodically
        if (!options.dryRun && sinceLastSave >= SAVE_INTERVAL) {
            saveManifest(manifest);
            sinceLastSave = 0;
        }

        // Progress log
        const processed = Math.min(i + MAX_CONCURRENCY, failureEntries.length);
        if (processed % 100 === 0 || processed === failureEntries.length) {
            console.log(`Progress: ${processed}/${failureEntries.length} (recovered: ${counters.recovered}, failed: ${counters.stillFailed})`);
        }
    }

    return counters;
}

// --- Firestore update ---

async function updateFirestoreDocs(db, bucket, manifest, attachmentById, dryRun) {
    console.log("\n--- Updating Firestore documents ---");
    let totalUpdated = 0;

    for (const collectionConfig of COLLECTIONS) {
        const snapshot = await db.collection(collectionConfig.name).get();
        console.log(`Collection ${collectionConfig.name}: ${snapshot.size} documents`);
        let updated = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data() || {};
            const updates = {};
            let changed = false;

            // Check image fields
            for (const fieldName of collectionConfig.imageFields) {
                const fieldValue = data[fieldName];
                if (typeof fieldValue !== "string") continue;

                const normalized = normalizeUrl(fieldValue);
                if (!normalized) continue;

                // Check if this URL has been recovered (via alias or direct item)
                const aliasTarget = manifest.aliases[normalized];
                const item = aliasTarget ? manifest.items[aliasTarget] : manifest.items[normalized];

                if (item?.downloadUrl && item.downloadUrl !== fieldValue) {
                    updates[fieldName] = item.downloadUrl;
                    changed = true;
                }
            }

            // Check HTML content fields
            for (const fieldName of collectionConfig.htmlFields) {
                const htmlValue = data[fieldName];
                if (typeof htmlValue !== "string" || !htmlValue) continue;

                const retiredUrls = extractRetiredImageUrlsFromHtml(htmlValue, attachmentById);
                if (retiredUrls.length === 0) continue;

                const replacements = new Map();
                for (const retiredUrl of retiredUrls) {
                    const normalized = normalizeUrl(retiredUrl);
                    if (!normalized) continue;

                    const aliasTarget = manifest.aliases[normalized];
                    const item = aliasTarget ? manifest.items[aliasTarget] : manifest.items[normalized];

                    if (item?.downloadUrl) {
                        replacements.set(retiredUrl, item.downloadUrl);
                        if (normalized) replacements.set(normalized, item.downloadUrl);
                    }
                }

                if (replacements.size > 0) {
                    updates[fieldName] = replaceRetiredImageUrlsInHtml(htmlValue, replacements, attachmentById);
                    changed = true;
                }
            }

            if (!changed) continue;

            updated += 1;
            console.log(`  Updating ${collectionConfig.name}/${docSnap.id}`);

            if (!dryRun) {
                await docSnap.ref.set({
                    ...updates,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    assetMirror: {
                        lastMirroredAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                }, { merge: true });
            }
        }

        console.log(`  ${collectionConfig.name}: ${updated} documents updated`);
        totalUpdated += updated;
    }

    return totalUpdated;
}

// --- Main ---

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const manifest = loadMirroredManifest(MANIFEST_PATH);
    const attachmentById = buildAttachmentMap(BACKUP_DIR);

    const allFailures = Object.entries(manifest.failures || {});

    // Filter by host if specified
    const failures = options.host
        ? allFailures.filter(([url]) => {
            try { return new URL(url).hostname === options.host; } catch { return false; }
        })
        : allFailures;

    // Apply limit
    const limited = failures.slice(0, options.limit);

    // Log breakdown by hostname
    const hostCounts = {};
    for (const [url] of limited) {
        try {
            const h = new URL(url).hostname;
            hostCounts[h] = (hostCounts[h] || 0) + 1;
        } catch {
            hostCounts["parse-error"] = (hostCounts["parse-error"] || 0) + 1;
        }
    }

    console.log(`Starting image recovery${options.dryRun ? " (dry run)" : ""}...`);
    console.log(`Total failures in manifest: ${allFailures.length}`);
    console.log(`Processing: ${limited.length} failures`);
    console.log(`Skip Wayback: ${options.skipWayback}`);
    console.log(`Skip Firestore update: ${options.skipFirestoreUpdate}`);
    console.log(`Storage bucket: ${bucket.name}`);
    console.log("\nFailure breakdown by host:");
    for (const [host, count] of Object.entries(hostCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count.toString().padStart(5)}  ${host}`);
    }
    console.log("");

    // Run recovery
    const counters = await processInBatches(limited, bucket, manifest, options);

    // Save final manifest
    if (!options.dryRun) {
        saveManifest(manifest);
    }

    console.log("\n--- Recovery Summary ---");
    console.log(JSON.stringify(counters, null, 2));

    // Update Firestore documents
    if (!options.skipFirestoreUpdate && (counters.recovered > 0 || counters.skipped > 0)) {
        const docsUpdated = await updateFirestoreDocs(db, bucket, manifest, attachmentById, options.dryRun);
        console.log(`\nFirestore: ${docsUpdated} documents updated`);
    } else if (options.skipFirestoreUpdate) {
        console.log("\nFirestore update skipped (--skip-firestore-update)");
    }

    // Final manifest stats
    const finalItems = Object.keys(manifest.items || {}).length;
    const finalFailures = Object.keys(manifest.failures || {}).length;
    console.log(`\nManifest: ${finalItems} items, ${finalFailures} failures`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
