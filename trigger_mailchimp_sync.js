
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Error: service-account.json not found at ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function triggerSync() {
    const email = 'pedro.moneo@gmail.com';
    console.log(`Searching for subscriber with email: ${email}`);

    const snapshot = await db.collection('subscribers').where('email', '==', email).get();

    if (snapshot.empty) {
        console.log('No matching subscriber found. Let us try to list all subscribers to see what we have.');
        const all = await db.collection('subscribers').limit(5).get();
        all.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
        return;
    }

    const doc = snapshot.docs[0];
    console.log(`Found subscriber: ${doc.id}`);

    // Update a field to trigger the function
    const timestamp = new Date().getTime();
    const newName = 'Pedro ' + timestamp;
    console.log(`Updating displayName to: ${newName}`);

    await doc.ref.update({
        displayName: newName,
        lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Update complete. Check logs for syncSubscriberToMailchimp.');
}

triggerSync().catch(console.error);
