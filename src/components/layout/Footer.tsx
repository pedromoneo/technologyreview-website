import Image from "next/image";
import Link from "next/link";
import { Facebook, Twitter, Linkedin, Instagram, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-black text-white pt-24 pb-12">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
                    {/* Brand Info */}
                    <div className="lg:col-span-5">
                        <div className="flex flex-col mb-8">
                            <div className="relative h-12 w-64 md:w-80">
                                <Image
                                    src="/logo-white.png"
                                    alt="MIT Technology Review"
                                    fill
                                    className="object-contain object-left"
                                />
                            </div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">
                                Publicado por <span className="text-white">Opinno</span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md font-medium">
                            La edición en español de la publicación del Instituto de Tecnología de Massachusetts (MIT) es el referente global para entender el impacto de las tecnologías emergentes en la sociedad y los negocios.
                        </p>

                        <div className="mt-12 space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Legal</h4>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                                <Link href="/terminos-y-condiciones" className="hover:text-accent transition-colors">Términos y Condiciones</Link>
                                <Link href="/politica-de-privacidad" className="hover:text-accent transition-colors">Política de Privacidad</Link>
                                <Link href="/cookies" className="hover:text-accent transition-colors">Cookies</Link>
                            </div>
                        </div>
                    </div>

                    {/* Links 1 */}
                    <div className="lg:col-span-2">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-10 text-gray-500">Secciones</h3>
                        <ul className="space-y-5 text-xs text-white/60 font-black uppercase tracking-widest">
                            <li><Link href="/" className="hover:text-accent transition-colors">Inicio</Link></li>
                            <li><Link href="/temas/inteligencia-artificial" className="hover:text-accent transition-colors">Temas</Link></li>
                            <li><Link href="#" className="hover:text-accent transition-colors">Informes</Link></li>
                            <li><Link href="#" className="hover:text-accent transition-colors">Eventos</Link></li>
                            <li><Link href="#" className="hover:text-accent transition-colors">Podcast</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-5 flex flex-col items-start lg:items-end">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] mb-10 text-gray-500">Sigue la innovación</h3>
                        <div className="flex space-x-4 mb-12">
                            {[
                                { icon: Linkedin, href: "https://www.linkedin.com/company/mit-technology-review-en-español" },
                                { icon: Instagram, href: "https://www.instagram.com/technologyreviewes/" },
                                { icon: Twitter, href: "https://twitter.com/techreview_es" },
                                { icon: Facebook, href: "https://www.facebook.com/technologyreview.es" },
                                { icon: Mail, href: "mailto:technologyreview@opinno.com" }
                            ].map((social, i) => (
                                <Link key={i} href={social.href} className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center hover:bg-accent hover:border-accent hover:text-primary transition-all group">
                                    <social.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </Link>
                            ))}
                        </div>
                        <button className="bg-accent text-primary px-10 py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all">
                            Suscríbete al Newsletter
                        </button>
                    </div>
                </div>

                <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                    <p>© 2026 OPINNO. TODOS LOS DERECHOS RESERVADOS.</p>
                </div>
            </div>
        </footer>
    );
}
