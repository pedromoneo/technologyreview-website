/**
 * Apply the mirrored_images.json manifest to Firestore documents.
 * This updates imageUrl fields and HTML content with the new Firebase Storage URLs.
 * Run after recover-failed-images.js has uploaded images but skipped Firestore updates.
 */
const admin = require("firebase-admin");
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

const COLLECTIONS = [
    { name: "articles", imageFields: ["imageUrl"], htmlFields: ["content"] },
    { name: "pages", imageFields: ["headerImageUrl"], htmlFields: ["content"] },
    { name: "informes", imageFields: ["imageUrl"], htmlFields: [] },
];

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

function resolveManifestUrl(value, manifest) {
    const normalized = normalizeUrl(value);
    if (!normalized) return null;

    // Direct item lookup
    const directItem = manifest.items[normalized];
    if (directItem) return directItem.downloadUrl || directItem.publicUrl;

    // Alias lookup
    const aliasTarget = manifest.aliases[normalized];
    if (aliasTarget) {
        const item = manifest.items[aliasTarget];
        if (item) return item.downloadUrl || item.publicUrl;
    }

    // Try original (non-normalized) value
    const directOriginal = manifest.items[value];
    if (directOriginal) return directOriginal.downloadUrl || directOriginal.publicUrl;

    const aliasOriginal = manifest.aliases[value];
    if (aliasOriginal) {
        const item = manifest.items[aliasOriginal];
        if (item) return item.downloadUrl || item.publicUrl;
    }

    return null;
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const manifest = loadMirroredManifest(MANIFEST_PATH);
    const attachmentById = buildAttachmentMap(BACKUP_DIR);

    console.log(`Manifest: ${Object.keys(manifest.items).length} items, ${Object.keys(manifest.aliases).length} aliases`);
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

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

                // Skip if already pointing to Firebase Storage
                if (fieldValue.includes("storage.googleapis.com") || fieldValue.includes("firebasestorage.googleapis.com")) continue;

                const newUrl = resolveManifestUrl(fieldValue, manifest);
                if (newUrl && newUrl !== fieldValue) {
                    updates[fieldName] = newUrl;
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
                    const newUrl = resolveManifestUrl(retiredUrl, manifest);
                    if (newUrl) {
                        replacements.set(retiredUrl, newUrl);
                        const normalized = normalizeUrl(retiredUrl);
                        if (normalized) replacements.set(normalized, newUrl);
                    }
                }

                if (replacements.size > 0) {
                    updates[fieldName] = replaceRetiredImageUrlsInHtml(htmlValue, replacements, attachmentById);
                    changed = true;
                }
            }

            if (!changed) continue;

            updated += 1;
            if (updated <= 10 || updated % 100 === 0) {
                const fields = Object.keys(updates).filter(k => k !== "updatedAt" && k !== "assetMirror");
                console.log(`  Updating ${collectionConfig.name}/${docSnap.id} [${fields.join(", ")}]`);
            }

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

        console.log(`  ${collectionConfig.name}: ${updated} documents updated\n`);
        totalUpdated += updated;
    }

    console.log(`\nTotal: ${totalUpdated} documents updated`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
