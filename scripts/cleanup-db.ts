import 'dotenv/config';
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

        // Improved Content Cleanup (handles artifacts that cause huge paragraphs)
        const newContent = content
            .replace(/rnrnrn/g, '\n\n')
            .replace(/rnrn/g, '\n\n')
            .replace(/rn</g, '\n<')
            .replace(/rn\s/g, '\n ')
            .replace(/([.!?])rn([A-ZÁÉÍÓÚ])/g, '$1\n\n$2')
            .replace(/([.!?])rn\s*([A-ZÁÉÍÓÚ])/g, '$1\n\n$2')
            .replace(/rn([A-ZÁÉÍÓÚ])/g, '\n\n$1')
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n');

        if (newContent !== content) {
            content = newContent;
            changed = true;
        }

        // Improved Excerpt Cleanup & Truncation
        let cleanedExcerpt = (excerpt || '')
            .replace(/<[^>]*>?/gm, "")
            .replace(/rnrnrn|rnrn|rn|\\r\\n|\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // Truncation logic for enormous excerpts
        if (cleanedExcerpt.length > 350) {
            const truncated = cleanedExcerpt.substring(0, 350);
            const lastSentenceEnd = Math.max(
                truncated.lastIndexOf(". "),
                truncated.lastIndexOf("! "),
                truncated.lastIndexOf("? ")
            );
            if (lastSentenceEnd > 150) {
                cleanedExcerpt = cleanedExcerpt.substring(0, lastSentenceEnd + 1);
            } else {
                cleanedExcerpt = truncated + "...";
            }
        }

        if (cleanedExcerpt !== excerpt) {
            excerpt = cleanedExcerpt;
            changed = true;
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
