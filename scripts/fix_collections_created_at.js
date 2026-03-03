const admin = require("firebase-admin");
const path = require("path");

// Use the existing service account file from the scripts directory
const serviceAccountPath = path.resolve(__dirname, "technology-review-es-firebase-adminsdk-pn4c5-c266474163.json");
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function fixCollections() {
    const db = admin.firestore();
    console.log("Fetching all collections...");
    const snap = await db.collection("collections").get();
    console.log(`Total collections: ${snap.docs.length}`);

    let fixedCount = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        console.log(`\nChecking Collection: ${doc.id} - ${data.title}`);

        if (!data.createdAt) {
            console.log(`  -> MISSING createdAt. Fixing...`);
            // Use updatedAt if available, otherwise use current time
            const timestampToUse = data.updatedAt ? data.updatedAt : admin.firestore.FieldValue.serverTimestamp();

            await db.collection("collections").doc(doc.id).update({
                createdAt: timestampToUse
            });
            console.log(`  -> Fixed!`);
            fixedCount++;
        } else {
            console.log(`  -> OK (createdAt exists)`);
        }
    }

    console.log(`\nFinished! Fixed ${fixedCount} collections.`);
}

fixCollections().catch(console.error);
