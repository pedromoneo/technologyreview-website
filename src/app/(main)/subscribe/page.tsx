"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { ArrowRight, Mail, Chrome, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SubscribePage() {
    const { loginWithGoogle, loginWithOTP, user } = useAuth();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            await loginWithGoogle();
        } catch (err: any) {
            setError("Error al iniciar sesión con Google");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        try {
            setIsLoading(true);
            setError("");
            await loginWithOTP(email);
            setIsSent(true);
        } catch (err: any) {
            setError("Error al enviar el enlace de acceso");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const [newsletterSuccess, setNewsletterSuccess] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    const handleNewsletterSignup = async () => {
        if (!user) return;
        try {
            setIsSubscribing(true);
            const { doc, updateDoc, setDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            // Update or create subscriber profile with newsletter opt-in
            const subscriberRef = doc(db, "subscribers", user.uid);
            await setDoc(subscriberRef, {
                newsletterSubscribed: true,
                newsletterSubscribedAt: new Date().toISOString(),
                status: 'subscribed' // Added for Mailchimp extension compatibility
            }, { merge: true });

            setNewsletterSuccess(true);
        } catch (err) {
            console.error("Error subscribing to newsletter:", err);
            setError("Error al suscribirse a la newsletter");
        } finally {
            setIsSubscribing(false);
        }
    };

    if (user) {
        return (
            <div className="min-h-screen pt-40 pb-20 flex items-center justify-center px-6 bg-gray-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 -skew-x-12 transform translate-x-1/2 pointer-events-none" />
                <div className="max-w-xl w-full relative z-10">
                    <div className="bg-white p-12 md:p-16 shadow-2xl border-t-8 border-primary text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>

                        <h1 className="text-4xl font-black italic tracking-tighter mb-4">¡Hola!</h1>
                        <p className="text-lg text-primary font-black uppercase tracking-widest mb-2">
                            El contenido de la revista es gratuito para nuestros usuarios.
                        </p>
                        <p className="text-gray-400 font-medium mb-10 text-sm">
                            Ya puedes disfrutar de todos nuestros artículos sin límites.
                        </p>

                        {!newsletterSuccess ? (
                            <button
                                onClick={handleNewsletterSignup}
                                disabled={isSubscribing}
                                className="w-full bg-primary text-white p-5 font-black uppercase tracking-widest text-xs hover:bg-accent hover:text-primary transition-all shadow-xl shadow-primary/10 flex items-center justify-center group disabled:opacity-50"
                            >
                                {isSubscribing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Pulsa aquí para suscribirte a nuestra newsletter
                                        <ArrowRight className="ml-3 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl animate-in zoom-in-95 duration-300">
                                <p className="text-emerald-600 font-black uppercase tracking-widest text-xs">
                                    Suscripción exitosa
                                </p>
                                <p className="text-emerald-500 font-medium text-[10px] mt-1 italic">
                                    Recibirás nuestras novedades en {user.email}
                                </p>
                            </div>
                        )}

                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <Link
                                href="/"
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-primary transition-colors"
                            >
                                ← Volver a la portada
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-40 pb-20 flex items-center justify-center px-6 bg-gray-50 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 -skew-x-12 transform translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-xl w-full relative z-10">
                <div className="bg-white p-12 md:p-16 shadow-2xl border-t-8 border-primary">
                    <div className="mb-12">
                        <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-6">Suscríbete.</h1>
                        <p className="text-lg text-gray-500 font-medium leading-relaxed">
                            Crea tu cuenta en <span className="text-primary font-bold">MIT Technology Review en español</span> y podrás leer artículos de forma ilimitada, y además podrás recibir nuestras newsletters.
                        </p>
                    </div>

                    {isSent ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-green-50 border border-green-100 p-8 text-center rounded-xl mb-8">
                                <Mail className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-black mb-2 tracking-tight">¡Enlace enviado!</h3>
                                <p className="text-sm text-green-700 font-medium">
                                    Hemos enviado un enlace de acceso a <span className="font-bold">{email}</span>.
                                    Haz clic en el enlace del email para iniciar sesión.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSent(false)}
                                className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                            >
                                ¿No has recibido nada? Intentar de nuevo
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Google Login */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 p-5 font-black uppercase tracking-widest text-xs hover:bg-gray-50 hover:border-primary/20 transition-all group"
                            >
                                <Chrome className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                                Continuar con Google
                            </button>

                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <span className="relative bg-white px-6 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">o por email</span>
                            </div>

                            {/* Magic Link Form */}
                            <form onSubmit={handleMagicLink} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        placeholder="TU@EMAIL.COM"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value.toUpperCase())}
                                        className="w-full border-2 border-gray-100 p-5 outline-none focus:border-primary transition-all font-black text-sm tracking-widest uppercase placeholder:text-gray-200"
                                    />
                                    <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-200" />
                                </div>

                                {error && (
                                    <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full bg-primary text-white p-5 font-black uppercase tracking-widest text-xs hover:bg-accent hover:text-primary transition-all shadow-xl shadow-primary/10 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Acceso mediante enlace <ArrowRight className="ml-3 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="text-[10px] text-gray-400 font-medium leading-relaxed text-center">
                                Al continuar, aceptas nuestros términos de servicio y política de privacidad.
                                Recibirás comunicaciones periódicas de MIT Technology Review.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        ¿Ya tienes cuenta? <Link href="/login" className="text-primary hover:text-accent transition-colors ml-2 underline">Inicia sesión aquí</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
