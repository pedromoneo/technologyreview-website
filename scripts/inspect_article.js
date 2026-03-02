const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(process.cwd(), "service-account.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectArticle(docId) {
    console.log(`Searching for article with ID: ${docId}`);
    const doc = await db.collection("articles").doc(docId).get();

    if (!doc.exists) {
        console.log("No article found with that ID.");
        return;
    }

    const data = doc.data();
    console.log("Article ID:", doc.id);
    console.log("Title:", data.title);
    console.log("--- Content Preview (First 1000 chars) ---");
    console.log(data.content.substring(0, 1000));
    console.log("--- End of Preview ---");

    const hasParagraphs = /<p[\s\S]*?>/i.test(data.content);
    console.log("Has <p> tags:", hasParagraphs);

    if (hasParagraphs) {
        const pCount = (data.content.match(/<p/g) || []).length;
        console.log("Number of <p> tags:", pCount);
    }
}

const docId = "104013";
inspectArticle(docId).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
