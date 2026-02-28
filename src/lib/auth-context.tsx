'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
    User,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
} from 'firebase/auth'
import { auth, db } from './firebase'
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Fallback super admin
export const SUPER_ADMINS = ['pedro.moneo@gmail.com']

interface AuthContextType {
    user: User | null
    loading: boolean
    isAdmin: boolean
    isSubscriber: boolean
    loginWithGoogle: () => Promise<void>
    loginWithOTP: (email: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isSubscriber, setIsSubscriber] = useState(false)

    useEffect(() => {
        // Handle Email Link Sign-in
        const checkEmailLink = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = typeof window !== 'undefined' ? window.localStorage.getItem('emailForSignIn') : null
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation')
                }
                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href)
                        if (typeof window !== 'undefined') window.localStorage.removeItem('emailForSignIn')
                    } catch (error) {
                        console.error('Error signing in with email link:', error)
                    }
                }
            }
        }
        checkEmailLink()

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            setUser(authUser)

            if (authUser?.email) {
                const normalizedEmail = authUser.email.toLowerCase();

                // 1. Check Admin Status (CMS)
                if (SUPER_ADMINS.includes(normalizedEmail)) {
                    setIsAdmin(true)
                } else {
                    try {
                        const q = query(
                            collection(db, 'authorized_users'),
                            where('email', '==', normalizedEmail)
                        )
                        const snapshot = await getDocs(q)
                        setIsAdmin(!snapshot.empty)
                    } catch (error) {
                        console.error('Error checking admin status:', error)
                        setIsAdmin(false)
                    }
                }

                // 2. Check & Sync Subscriber Status (Magazine)
                try {
                    const subscriberRef = doc(db, 'subscribers', authUser.uid);
                    const subscriberSnap = await getDoc(subscriberRef);

                    if (!subscriberSnap.exists()) {
                        // Create basic subscriber profile
                        await setDoc(subscriberRef, {
                            email: normalizedEmail,
                            displayName: authUser.displayName || '',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp(),
                            status: 'active'
                        }, { merge: true });
                        setIsSubscriber(true);
                    } else {
                        // Update last login
                        await setDoc(subscriberRef, {
                            lastLogin: serverTimestamp()
                        }, { merge: true });
                        setIsSubscriber(true);
                    }
                } catch (error) {
                    console.error('Error syncing subscriber status:', error)
                    setIsSubscriber(false)
                }
            } else {
                setIsAdmin(false)
                setIsSubscriber(false)
            }

            setLoading(false)
        })

        return unsubscribe
    }, [])

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
    }

    const loginWithOTP = async (email: string) => {
        const functions = getFunctions();
        const sendMagicLink = httpsCallable(functions, 'sendMagicLink');

        await sendMagicLink({
            email: email.toLowerCase().trim(),
            url: window.location.origin + '/subscribe'
        });

        window.localStorage.setItem('emailForSignIn', email.toLowerCase().trim());
    }

    const logout = async () => {
        await signOut(auth)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin,
            isSubscriber,
            loginWithGoogle,
            loginWithOTP,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
