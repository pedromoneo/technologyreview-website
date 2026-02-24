import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    projectId: "techreview-mgz-1771952",
    appId: "1:275051155887:web:028533722e7d0f9b60df5a",
    storageBucket: "techreview-mgz-1771952.firebasestorage.app",
    apiKey: "AIzaSyCeerOm4520rzxGR7vs21L-qJNL0zO8qj4",
    authDomain: "techreview-mgz-1771952.firebaseapp.com",
    messagingSenderId: "275051155887",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
