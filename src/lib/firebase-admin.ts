import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'techreview-mgz-1771952',
    });
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
