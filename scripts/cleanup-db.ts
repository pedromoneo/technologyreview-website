
import * as admin from 'firebase-admin';
import { db } from '../src/lib/firebase-admin';

async function cleanupDatabase() {
    console.log('Starting database cleanup...');

    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.get();

    console.log(`Analyzing ${snapshot.size} articles...`);

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let changed = false;

        let content = data.content || '';
        let excerpt = data.excerpt || '';

        // Check for artifacts in content
        if (content.includes('rnrn') || content.includes('rn<') || content.includes('\\n')) {
            // We don't want to replace "rn" everywhere as it might be part of words,
            // but "rnrn" and "rn<" are definitely artifacts.
            // However, for the purpose of a one-time cleanup, we'll be thorough.

            const newContent = content
                .replace(/rnrnrn/g, '\n\n')
                .replace(/rnrn/g, '\n\n')
                .replace(/\\r\\n/g, '\n')
                .replace(/\\n/g, '\n')
                .replace(/rn</g, '\n<');

            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        }

        // Check for artifacts in excerpt
        if (excerpt.includes('rnrn') || excerpt.includes('rn')) {
            const newExcerpt = excerpt
                .replace(/rnrnrn/g, ' ')
                .replace(/rnrn/g, ' ')
                .replace(/rn/g, ' ')
                .replace(/\\r\\n|\\n/g, ' ');

            if (newExcerpt !== excerpt) {
                excerpt = newExcerpt;
                changed = true;
            }
        }

        if (changed) {
            await doc.ref.update({
                content,
                excerpt,
                cleanedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`Updated ${updatedCount} articles...`);
            }
        }
    }

    console.log(`Cleanup complete! ${updatedCount} articles updated.`);
}

cleanupDatabase().catch(console.error);
