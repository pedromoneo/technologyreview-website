const admin = require('firebase-admin');
admin.initializeApp({ projectId: "techreview-mgz-1771952" });
const db = admin.firestore();
async function run() {
    const snapshot = await db.collection("articles").limit(5).get();
    snapshot.forEach(doc => {
        console.log("ID:", doc.id, " | Title:", doc.data().title);
    });
}
run().then(() => process.exit(0)).catch(console.error);
