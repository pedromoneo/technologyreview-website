import * as admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import { Firestore } from 'firebase-admin/firestore';
import { Auth } from 'firebase-admin/auth';

let app: App;

const initializeApp = () => {
    const serviceAccountKey = process.env.ADMIN_SDK_KEY;
    if (serviceAccountKey) {
        try {
            let serviceAccount;
            try {
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch (jsonError) {
                try {
                    const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
                    serviceAccount = JSON.parse(decoded);
                } catch (b64Error) {
                    throw new Error('Could not parse ADMIN_SDK_KEY');
                }
            }
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } catch (error) {
            console.error('Firebase admin initialization error:', error);
            // Fallback
            return admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
    } else {
        return admin.initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
};

if (!admin.apps.length) {
    app = initializeApp();
} else {
    app = admin.apps[0] as App;
}

let db: Firestore;
let auth: Auth;

try {
    // Use the specific app instance
    db = admin.firestore(app);
    auth = admin.auth(app);
} catch (e) {
    console.error('Error getting services:', e);
}

export { db, auth };
