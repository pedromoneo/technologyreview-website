const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    const serviceAccountKey = process.env.ADMIN_SDK_KEY;
    if (serviceAccountKey) {
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountKey);
        } catch (e) {
            const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
            serviceAccount = JSON.parse(decoded);
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function diagnose() {
    console.log(`Hunting for potential issues in the last 50 articles...`);
    const snapshot = await db.collection('articles').orderBy('updatedAt', 'desc').limit(50).get();

    if (snapshot.empty) {
        console.log('No articles found.');
        return;
    }

    let issuesCount = 0;
    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        // Heuristic for English: presence of very common short English words
        const isEnglish = /(^|\s)(the|and|how|with)\s/i.test(data.title);
        const hasNoImage = !data.imageUrl;
        const isEmptyContent = !data.content || data.content.length < 100;

        if (isEnglish || hasNoImage || isEmptyContent) {
            issuesCount++;
            console.log(`${issuesCount}. ID: ${data.originalId}`);
            console.log(`   Title: ${data.title}`);
            console.log(`   Issues: ${isEnglish ? '[POTENTIALLY ENGLISH] ' : ''}${hasNoImage ? '[MISSING IMAGE] ' : ''}${isEmptyContent ? '[EMPTY CONTENT]' : ''}`);
            console.log(`   ---`);
        }
    });

    if (issuesCount === 0) {
        console.log('No major issues found in the last 50 articles!');
    } else {
        console.log(`Summary: Found ${issuesCount} articles with potential issues.`);
    }
}

diagnose().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
