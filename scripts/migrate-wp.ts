
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const {
    buildAttachmentMap,
    extractRetiredImageUrlsFromHtml,
    loadMirroredManifest,
    replaceRetiredImageUrlsInHtml,
    resolveMirroredAssetUrl,
} = require('./wp-image-utils');

// You need to download a service account key from Firebase Console:
// Project Settings > Service Accounts > Generate new private key
// Save it as service-account.json in the root of your project
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: service-account.json not found in the root directory.');
    console.error('Please download it from Firebase Console > Project Settings > Service Accounts.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
    console.log('Reading integrated_articles.json...');
    const backupDir = path.join(process.cwd(), 'backup_data');
    const dataPath = path.join(backupDir, 'integrated_articles.json');
    const articles = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const attachmentById = buildAttachmentMap(backupDir);
    const mirroredManifest = loadMirroredManifest(path.join(backupDir, 'mirrored_images.json'));

    const normalizedArticles = articles.map((article: any) => {
        const content = article.content || '';
        const replacements = new Map();

        for (const imageUrl of extractRetiredImageUrlsFromHtml(content, attachmentById)) {
            replacements.set(
                imageUrl,
                resolveMirroredAssetUrl(imageUrl, attachmentById, mirroredManifest)
            );
        }

        return {
            ...article,
            imageUrl: resolveMirroredAssetUrl(article.imageUrl, attachmentById, mirroredManifest),
            content: replaceRetiredImageUrlsInHtml(content, replacements, attachmentById),
        };
    });

    console.log(`Starting migration of ${normalizedArticles.length} articles...`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < normalizedArticles.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = normalizedArticles.slice(i, i + BATCH_SIZE);

        chunk.forEach((article: any) => {
            const articleRef = db.collection('articles').doc(article.id.toString());

            // Firestore limit is 1MB. Let's truncate content if it's too large to prevent crashes.
            let content = article.content || '';
            if (Buffer.byteLength(content, 'utf8') > 900000) {
                console.warn(`Article ${article.id} is too large, truncating content.`);
                content = content.substring(0, 400000); // Drastic truncation to avoid byte length issues
            }

            batch.set(articleRef, {
                ...article,
                content: content,
                migratedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Uploaded ${Math.min(i + BATCH_SIZE, normalizedArticles.length)}/${normalizedArticles.length} articles...`);
    }

    console.log('Migration complete!');
}

migrate().catch(console.error);
