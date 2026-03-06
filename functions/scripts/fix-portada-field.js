/**
 * One-time script to add isFeaturedInHeader: true to all articles
 * that don't have this field set. Uses Application Default Credentials.
 *
 * Usage: node functions/scripts/fix-portada-field.js
 */
const admin = require("firebase-admin");

admin.initializeApp({
    projectId: "techreview-mgz-1771952"
});

const db = admin.firestore();

async function fixPortadaField() {
    console.log("Starting: Adding isFeaturedInHeader to articles missing this field...\n");

    const snapshot = await db.collection("articles").get();
    let updatedCount = 0;
    let skippedCount = 0;
    let totalCount = 0;
    let batchOps = [];
    let batch = db.batch();

    for (const doc of snapshot.docs) {
        totalCount++;
        const data = doc.data();

        // Only add isFeaturedInHeader if it's not already set
        if (data.isFeaturedInHeader === undefined || data.isFeaturedInHeader === null) {
            batch.update(doc.ref, { isFeaturedInHeader: true });
            updatedCount++;
            batchOps.push(1);

            // Firestore batch limit is 500
            if (batchOps.length >= 490) {
                await batch.commit();
                console.log(`  Committed batch: ${updatedCount} updated so far...`);
                batch = db.batch();
                batchOps = [];
            }
        } else {
            skippedCount++;
        }
    }

    // Commit remaining
    if (batchOps.length > 0) {
        await batch.commit();
    }

    console.log(`\nDone!`);
    console.log(`  Total articles: ${totalCount}`);
    console.log(`  Updated (added isFeaturedInHeader: true): ${updatedCount}`);
    console.log(`  Skipped (already had field): ${skippedCount}`);
    process.exit(0);
}

fixPortadaField().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
