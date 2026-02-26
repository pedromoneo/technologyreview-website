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

async function normalize() {
    console.log('Normalizing articles...');
    const snapshot = await db.collection('articles').get();

    console.log(`Found ${snapshot.size} articles. Processing...`);

    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let changed = false;
        const update = {};

        // 1. Normalize status
        if (!data.status) {
            update.status = 'published';
            changed = true;
        }

        // 2. Clean excerpt
        if (data.excerpt) {
            const cleanExcerpt = data.excerpt
                .replace(/<[^>]*>?/gm, "")
                .replace(/rnrn/g, ' ')
                .replace(/rn/g, ' ')
                .replace(/\\_/g, ' ')
                .trim();

            if (cleanExcerpt !== data.excerpt) {
                update.excerpt = cleanExcerpt;
                changed = true;
            }
        }

        if (changed) {
            batch.update(doc.ref, update);
            count++;

            // Commit in chunks of 400
            if (count % 400 === 0) {
                await batch.commit();
                console.log(`Committed ${count} updates...`);
                batch = db.batch(); // Re-initialize the batch
            }
        }
    }

    if (count % 400 !== 0) {
        await batch.commit();
    }

    console.log(`Normalization complete. Updated ${count} articles.`);
}

normalize().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
