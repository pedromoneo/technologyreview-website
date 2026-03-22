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
import { auth, db, functions } from './firebase'
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

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

        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser)
            setLoading(false)

            if (authUser?.email) {
                const normalizedEmail = authUser.email.toLowerCase();

                // 1. Check Admin Status (CMS) — runs in background
                const adminDocRef = doc(db, 'authorized_users', normalizedEmail);

                if (SUPER_ADMINS.includes(normalizedEmail)) {
                    setIsAdmin(true);
                    setDoc(adminDocRef, {
                        email: normalizedEmail,
                        role: "Super Admin",
                        lastLoginAt: serverTimestamp()
                    }, { merge: true }).catch((error) => console.error('Error updating admin doc:', error));
                } else {
                    getDoc(adminDocRef).then((adminDoc) => {
                        const userIsAdmin = adminDoc.exists();
                        setIsAdmin(userIsAdmin);
                        if (userIsAdmin) {
                            setDoc(adminDocRef, {
                                lastLoginAt: serverTimestamp()
                            }, { merge: true }).catch((error) => console.error('Error updating admin login:', error));
                        }
                    }).catch((error) => {
                        console.error('Error checking admin status:', error);
                        setIsAdmin(false);
                    });
                }

                // 2. Check & Sync Subscriber Status (Magazine) — runs in background
                const subscriberRef = doc(db, 'subscribers', authUser.uid);
                getDoc(subscriberRef).then((subscriberSnap) => {
                    if (!subscriberSnap.exists()) {
                        setDoc(subscriberRef, {
                            email: normalizedEmail,
                            displayName: authUser.displayName || '',
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp(),
                            status: 'active'
                        }, { merge: true }).catch((error) => console.error('Error creating subscriber:', error));
                    } else {
                        setDoc(subscriberRef, {
                            lastLogin: serverTimestamp()
                        }, { merge: true }).catch((error) => console.error('Error updating subscriber login:', error));
                    }
                    setIsSubscriber(true);
                }).catch((error) => {
                    console.error('Error syncing subscriber status:', error)
                    setIsSubscriber(false)
                });
            } else {
                setIsAdmin(false)
                setIsSubscriber(false)
            }
        })

        return unsubscribe
    }, [])

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
    }

    const loginWithOTP = async (email: string) => {
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
