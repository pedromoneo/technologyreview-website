const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "techreview-mgz-1771952"
    });
}

const db = admin.firestore();

async function inspectArticles() {
    const snapshot = await db.collection("articles").limit(5).get();
    console.log(`Found ${snapshot.size} articles total.`);

    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(`Source: ${doc.data().source}`);
        console.log(`Title: ${doc.data().title}`);
        console.log(`OriginalId: ${doc.data().originalId}`);
    });
}

inspectArticles().catch(console.error);
