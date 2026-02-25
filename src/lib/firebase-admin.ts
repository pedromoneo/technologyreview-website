import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } catch (error) {
            console.error('Firebase admin initialization error', error);
        }
    } else {
        // Fallback or local dev
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } catch (error) {
            console.warn('Could not initialize Firebase Admin SDK. Expected locally without GOOGLE_APPLICATION_CREDENTIALS.', error);
        }
    }
}

let db: FirebaseFirestore.Firestore;
let auth: admin.auth.Auth;

try {
    db = admin.firestore();
    auth = admin.auth();
} catch (e) {
    // Allows Next.js to compile without crashing gracefully
}

export { db, auth };
