const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const POSTS_PATH = path.resolve(__dirname, "../backup_data/posts.jsonl");

function parseArgs(argv) {
    const args = {
        dryRun: argv.includes("--dry-run"),
        limit: Infinity,
        docIds: [],
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
    });
}

function readPostsById() {
    const posts = fs.readFileSync(POSTS_PATH, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((post) => post.post_type === "post");

    return new Map(posts.map((post) => [String(post.ID), post]));
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const app = ensureFirebase();
    const db = admin.firestore(app);
    const postsById = readPostsById();

    let docs;
    if (options.docIds.length > 0) {
        const refs = options.docIds.map((id) => db.collection("articles").doc(id));
        docs = (await db.getAll(...refs)).filter((doc) => doc.exists);
    } else {
        docs = (await db.collection("articles").get()).docs;
    }

    let updated = 0;
    let skipped = 0;

    for (const docSnap of docs) {
        if (updated >= options.limit) {
            break;
        }

        const data = docSnap.data() || {};
        const backupId = String(data.originalId || docSnap.id);
        const post = postsById.get(backupId);

        if (!post || !post.post_name) {
            skipped += 1;
            continue;
        }

        const updates = {
            legacySlug: post.post_name,
            legacyPath: `/article/${post.post_name}`,
            originalUrl: `https://technologyreview.es/article/${post.post_name}/`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        updated += 1;
        console.log(`Backfilling ${docSnap.id} -> ${updates.legacyPath}`);

        if (!options.dryRun) {
            await docSnap.ref.set(updates, { merge: true });
        }
    }

    console.log(JSON.stringify({ updated, skipped, dryRun: options.dryRun }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
