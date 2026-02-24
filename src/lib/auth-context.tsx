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
    signInWithEmailLink
} from 'firebase/auth'
import { auth } from './firebase'

// Define our specific admin emails
const ADMIN_EMAILS = ['pedro.moneo@gmail.com']

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

    // Handle incoming Email Sign-in links
    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn')
            if (!email) {
                email = window.prompt('Por favor, introduce tu email para confirmar el inicio de sesión')
            }
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then(() => {
                        window.localStorage.removeItem('emailForSignIn')
                        window.history.replaceState({}, '', window.location.pathname)
                    })
                    .catch((error) => {
                        console.error('Error in email link sign-in:', error)
                        alert('El enlace ha caducado o ya ha sido utilizado.')
                    })
            }
        }
    }, [])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user)
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
            url: window.location.href, // Redirect back to current page
            handleCodeInApp: true,
        }
        await sendSignInLinkToEmail(auth, email, actionCodeSettings)
        window.localStorage.setItem('emailForSignIn', email)
    }

    const logout = async () => {
        await signOut(auth)
    }

    const isAdmin = user ? ADMIN_EMAILS.includes(user.email || '') : false

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
