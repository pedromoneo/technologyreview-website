const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "techreview-mgz-1771952"
    });
}
const db = admin.firestore();

async function runMigration() {
    console.log("Starting Authorized Users Migration...");
    const usersRef = db.collection("authorized_users");
    const snapshot = await usersRef.get();

    let migratedCount = 0;
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;

        if (data.email) {
            const emailId = data.email.toLowerCase().trim();
            if (id !== emailId) {
                console.log(`Migrating user: ${data.email} (Old ID: ${id})`);
                const newRef = usersRef.doc(emailId);
                batch.set(newRef, data);
                batch.delete(doc.ref);
                migratedCount++;
            }
        }
    });

    if (migratedCount > 0) {
        await batch.commit();
        console.log(`Migration complete! Successfully migrated ${migratedCount} users.`);
    } else {
        console.log("No users needed migration.");
    }
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
