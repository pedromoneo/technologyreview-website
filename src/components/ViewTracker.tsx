'use client';

import { useEffect, useRef } from 'react';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ViewTracker({ collectionName, documentId }: { collectionName: string, documentId: string }) {
    const tracked = useRef(false);

    useEffect(() => {
        if (!tracked.current && db) {
            tracked.current = true;

            // Increment the view count for the document without awaiting
            const docRef = doc(db, collectionName, documentId);
            updateDoc(docRef, {
                views: increment(1)
            }).catch(err => console.error("Error tracking view:", err));
        }
    }, [collectionName, documentId]);

    return null; /* Client component that purely runs effect without UI */
}
