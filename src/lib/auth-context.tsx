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
import { collection, query, where, getDocs } from 'firebase/firestore'

// Fallback super admin
const SUPER_ADMINS = ['pedro.moneo@gmail.com']

interface AuthContextType {
    user: User | null
    loading: boolean
    isAdmin: boolean
    loginWithGoogle: () => Promise<void>
    loginWithOTP: (email: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        // Handle Email Link Sign-in
        const checkEmailLink = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn')
                if (!email) {
                    email = window.prompt('Please provide your email for confirmation')
                }
                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href)
                        window.localStorage.removeItem('emailForSignIn')
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
                // Check if user is super admin
                if (SUPER_ADMINS.includes(authUser.email)) {
                    setIsAdmin(true)
                } else {
                    // Check Firestore for authorization
                    try {
                        const q = query(
                            collection(db, 'authorized_users'),
                            where('email', '==', authUser.email.toLowerCase())
                        )
                        const snapshot = await getDocs(q)
                        setIsAdmin(!snapshot.empty)
                    } catch (error) {
                        console.error('Error checking admin status:', error)
                        setIsAdmin(false)
                    }
                }
            } else {
                setIsAdmin(false)
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
        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true,
        }
        await sendSignInLinkToEmail(auth, email, actionCodeSettings)
        window.localStorage.setItem('emailForSignIn', email)
    }

    const logout = async () => {
        await signOut(auth)
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin,
            loginWithGoogle,
            loginWithOTP,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
