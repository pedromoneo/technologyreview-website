const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), "serviceAccountKey.json");
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
} else {
    // Try to get from env if file doesn't exist
    const project_id = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const admin_key = process.env.ADMIN_SDK_KEY;
    if (project_id && admin_key) {
        serviceAccount = JSON.parse(Buffer.from(admin_key, 'base64').toString());
    } else {
        console.error("No service account key found.");
        process.exit(1);
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

function slugify(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, "-")           // Replace spaces with -
        .replace(/[^\w-]/g, "")          // Remove all non-word chars
        .replace(/--+/g, "-")           // Replace multiple - with single -
        .trim();                        // Trim from both sides
}

async function migrateInformes() {
    const snapshot = await db.collection("informes").get();

    console.log(`Found ${snapshot.size} informes to migrate.`);

    const batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};

        if (!data.status) {
            updates.status = "published";
        }

        if (!data.slug) {
            updates.slug = slugify(data.title);
        }

        if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            count++;
            console.log(`Migrating "${data.title}":`, updates);
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully migrated ${count} informes.`);
    } else {
        console.log("No migration needed.");
    }
}

migrateInformes().catch(console.error);
