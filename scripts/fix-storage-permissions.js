/**
 * Fix Firebase Storage permissions for restored article images.
 * Makes all files under restored/ and scraped/ publicly accessible.
 */
const admin = require("firebase-admin");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

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

async function main() {
    const prefix = process.argv[2] || "restored/";
    const dryRun = process.argv.includes("--dry-run");

    const app = ensureFirebase();
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    console.log(`Making all files under "${prefix}" public...`);
    console.log(`Bucket: ${bucket.name}`);
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

    const [files] = await bucket.getFiles({ prefix });
    console.log(`Found ${files.length} files\n`);

    let made = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i++) {
        try {
            if (!dryRun) {
                await files[i].makePublic();
            }
            made++;

            if ((i + 1) % 200 === 0) {
                console.log(`Progress: ${i + 1}/${files.length} (made public: ${made})`);
            }
        } catch (error) {
            errors++;
            if (errors <= 5) {
                console.error(`  Error: ${files[i].name} -> ${error.message}`);
            }
        }
    }

    console.log(`\nDone: ${made} files made public, ${errors} errors`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
