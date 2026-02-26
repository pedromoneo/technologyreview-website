const admin = require('firebase-admin');
require('dotenv').config({ path: '../.env.local' });

if (!process.env.ADMIN_SDK_KEY) {
    console.error('Missing ADMIN_SDK_KEY env var.');
    process.exit(1);
}

try {
    const key = JSON.parse(Buffer.from(process.env.ADMIN_SDK_KEY, 'base64').toString());
    admin.initializeApp({
        credential: admin.credential.cert(key)
    });
} catch (e) {
    console.error('Error initializing admin sdk:', e);
    process.exit(1);
}

const db = admin.firestore();

async function promote() {
    console.log('Promoting latest drafts to published...');
    // We target specifically the 3 that were stuck in draft
    const ids = ['3Xh7JaUeu8tnHiPB8Sxv', 'dxSt9cGxKfwa9UGc5opC', 'FeLn3NyiAjJKn6iZfYra'];

    for (const id of ids) {
        await db.collection('articles').doc(id).update({ status: 'published' });
        console.log(`Promoted ${id} to published.`);
    }
}

promote().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
