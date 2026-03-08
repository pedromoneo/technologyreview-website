"use client";

import { useEffect, useState } from "react";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    Timestamp
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
    Activity,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronRight,
    AlertCircle
} from "lucide-react";

interface ApiLog {
    id: string;
    timestamp: Timestamp;
    type: string;
    status: 'success' | 'error' | 'in_progress';
    message: string;
    details?: any;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<ApiLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [retryingTranslations, setRetryingTranslations] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "api_logs"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ApiLog[];
            setLogs(logsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching logs:", err);
            setError("Error al cargar los logs. Asegúrate de tener permisos.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSyncNow = async () => {
        if (syncing) return;
        setSyncing(true);
        setError(null);
        try {
            const manualSync = httpsCallable(functions, 'manualSync', {
                timeout: 1200000 // 20 minutes
            });
            await manualSync({ limit: 5, offset: 0 });
        } catch (err: any) {
            console.error("Sync error:", err);
            setError(err.message || "Error al iniciar la sincronización manual");
        } finally {
            setSyncing(false);
        }
    };

    const handleRetryTranslations = async () => {
        if (retryingTranslations) return;
        setRetryingTranslations(true);
        setError(null);
        try {
            const retryTranslations = httpsCallable(functions, "retryTranslationsNow", {
                timeout: 1200000
            });
            await retryTranslations({ limit: 10 });
        } catch (err: any) {
            console.error("Retry translations error:", err);
            setError(err.message || "Error al reintentar las traducciones pendientes");
        } finally {
            setRetryingTranslations(false);
        }
    };

    const StatusBadge = ({ status }: { status: ApiLog['status'] }) => {
        switch (status) {
            case 'success':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-green-100 text-green-800 uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Éxito
                    </span>
                );
            case 'error':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 uppercase tracking-tighter">
                        <XCircle className="w-3 h-3 mr-1" /> Error
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 uppercase tracking-tighter animate-pulse">
                        <Clock className="w-3 h-3 mr-1" /> En curso
                    </span>
                );
            default:
                return null;
        }
    };

    const getProcessedArticleStatusMeta = (status: string) => {
        switch (status) {
            case "success":
                return {
                    dotClass: "bg-green-500",
                    badgeClass: "bg-green-50 text-green-700",
                    label: "Traducido",
                };
            case "updated":
                return {
                    dotClass: "bg-blue-500",
                    badgeClass: "bg-blue-50 text-blue-700",
                    label: "Actualizado",
                };
            case "pending_translation":
                return {
                    dotClass: "bg-amber-500",
                    badgeClass: "bg-amber-50 text-amber-700",
                    label: "Pendiente",
                };
            case "skipped":
                return {
                    dotClass: "bg-gray-300",
                    badgeClass: "bg-gray-100 text-gray-500",
                    label: "Omitido",
                };
            default:
                return {
                    dotClass: "bg-red-500",
                    badgeClass: "bg-red-50 text-red-700",
                    label: "Error",
                };
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-accent rounded-lg">
                            <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-primary">
                            Registro de Actividad
                        </h1>
                    </div>
                    <p className="text-gray-500 font-medium tracking-tight">
                        Monitorea las sincronizaciones automáticas y el estado de la API.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleRetryTranslations}
                        disabled={retryingTranslations}
                        className="flex items-center justify-center space-x-3 px-6 py-4 border border-gray-200 text-primary rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <RefreshCcw className={`w-5 h-5 ${retryingTranslations ? 'animate-spin' : ''}`} />
                        <span>{retryingTranslations ? 'Reintentando' : 'Reintentar Traducciones'}</span>
                    </button>
                    <button
                        onClick={handleSyncNow}
                        disabled={syncing}
                        className="flex items-center justify-center space-x-3 px-8 py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-95"
                    >
                        <RefreshCcw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Sincronizando' : 'Sincronizar Ahora'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-red-800 font-bold uppercase tracking-tight">Atención</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Fecha y Hora</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tipo</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estado</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Mensaje</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-16 bg-gray-50/20"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold italic translate-y-1">
                                        No se han encontrado registros de actividad aún.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <>
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-bold text-gray-900 tracking-tight">
                                                    {log.timestamp?.toDate().toLocaleDateString('es-ES', {
                                                        day: '2-digit',
                                                        month: 'long'
                                                    })}
                                                </div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {log.timestamp?.toDate().toLocaleTimeString('es-ES', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <StatusBadge status={log.status} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-medium text-gray-700 max-w-md truncate">
                                                    {log.message}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                    className={`p-2 transition-all hover:scale-110 active:scale-90 ${expandedLogId === log.id ? 'text-primary rotate-90' : 'text-gray-300 hover:text-primary'}`}
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expanded Articles List */}
                                        {expandedLogId === log.id && log.details?.processedArticles && (
                                            <tr className="bg-gray-50/30">
                                                <td colSpan={5} className="px-12 py-6 border-l-4 border-primary">
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">
                                                            Artículos Procesados
                                                        </h4>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {log.details.processedArticles.map((article: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className={`w-2 h-2 rounded-full ${getProcessedArticleStatusMeta(article.status).dotClass}`} />
                                                                        <span className="text-xs font-bold text-gray-800">{article.title}</span>
                                                                        <span className="text-[10px] text-gray-400 font-medium font-mono">ID: {article.id}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getProcessedArticleStatusMeta(article.status).badgeClass}`}>
                                                                            {getProcessedArticleStatusMeta(article.status).label}
                                                                        </span>
                                                                        {article.error && (
                                                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter max-w-xs truncate">
                                                                                {article.error}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
