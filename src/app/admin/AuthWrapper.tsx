'use client'

import { ReactNode, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { LogIn, Mail, ShieldAlert, Loader2 } from 'lucide-react'

function AuthCheck({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin, loginWithGoogle, logout } = useAuth()
    const [loginLoading, setLoginLoading] = useState(false)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
                        <div className="bg-primary p-12 text-white text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 -skew-x-12 transform translate-x-1/2 -translate-y-1/2" />
                            <h2 className="text-3xl font-black italic tracking-tighter mb-2 relative z-10">TR CMS</h2>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] relative z-10">Access restricted to staff</p>
                        </div>

                        <div className="p-12 space-y-8">
                            <div className="text-center">
                                <p className="text-sm text-gray-500 font-medium">
                                    Sign in with your authorized Google account to manage the Technology Review platform.
                                </p>
                            </div>

                            <button
                                onClick={async () => {
                                    setLoginLoading(true)
                                    try {
                                        await loginWithGoogle()
                                    } catch (e) {
                                        console.error(e)
                                    } finally {
                                        setLoginLoading(false)
                                    }
                                }}
                                disabled={loginLoading}
                                className="w-full flex items-center justify-center gap-4 bg-white border-2 border-primary text-primary font-black uppercase tracking-widest text-xs py-5 rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loginLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Login with Google
                                    </>
                                )}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="bg-white px-4 text-gray-400">O accede con un enlace</span>
                                </div>
                            </div>

                            <AuthOTPForm />

                            <div className="pt-4 text-center">
                                <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors">
                                    ← Back to Main Site
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center space-x-2 text-gray-400">
                        <ShieldAlert className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Secured by Firebase</span>
                    </div>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-2xl text-center border-t-8 border-accent">
                    <ShieldAlert className="w-20 h-20 text-accent mx-auto mb-8" />
                    <h2 className="text-3xl font-black italic tracking-tighter text-primary mb-4">Access Denied</h2>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        Your account (<span className="text-primary font-bold">{user.email}</span>) is not authorized to access this CMS. Please contact the administrator.
                    </p>
                    <button
                        onClick={() => logout()}
                        className="bg-primary text-white px-10 py-4 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-accent hover:text-primary transition-all active:scale-95"
                    >
                        Switch Account / Logout
                    </button>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

function AuthOTPForm() {
    const { loginWithOTP } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)
        try {
            await loginWithOTP(email)
            setSent(true)
        } catch (error) {
            console.error(error)
            alert('Error al enviar el enlace. Inténtalo de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-emerald-200">
                    <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-800 mb-2">¡Enlace enviado!</h3>
                <p className="text-[11px] font-bold text-emerald-600/80 leading-relaxed">
                    Hemos enviado un enlace de acceso a <span className="text-emerald-700 font-black">{email}</span>. Revisa tu bandeja de entrada.
                </p>
                <button
                    onClick={() => setSent(false)}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:underline"
                >
                    Probar con otro email
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="TU EMAIL DE TR..."
                    required
                    className="w-full bg-gray-50 border-2 border-transparent rounded-xl pl-12 pr-6 py-4 text-xs font-black uppercase tracking-widest outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                />
            </div>
            <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:bg-accent hover:text-primary transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Recibir Enlace Mágico <LogIn className="w-4 h-4" /></>}
            </button>
        </form>
    )
}


import Link from 'next/link'
import { AuthProvider as LibAuthProvider } from '@/lib/auth-context'

export function AuthWrapper({ children }: { children: ReactNode }) {
    return (
        <AuthCheck>
            {children}
        </AuthCheck>
    )
}
