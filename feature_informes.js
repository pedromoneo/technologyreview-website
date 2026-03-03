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

async function featureInformes() {
    const slugs = [
        "10-tecnologias-emergentes-2026",
        "innovadores-menores-de-35-latinoamerica-2025"
    ];

    for (const slug of slugs) {
        const snapshot = await db.collection("informes").where("slug", "==", slug).limit(1).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({ status: "featured" });
            console.log(`Marked "${doc.data().title}" as featured.`);
        } else {
            console.log(`Report with slug "${slug}" not found.`);
        }
    }
}

featureInformes().catch(console.error);
