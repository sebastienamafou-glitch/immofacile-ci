"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api"; 
import { 
  ArrowLeft, Search, ShieldAlert, UserPlus, 
  Banknote, Activity, FileSpreadsheet, Fingerprint, Calendar, Loader2,
  ShieldCheck // ✅ Ajouté pour les logs KYC
} from "lucide-react";
import { toast } from "sonner";
import { AuditAction } from "@prisma/client"; // ✅ Typage strict depuis Prisma

// ✅ BEST PRACTICE : Interface alignée avec Prisma
interface AuditLog {
  id: string;
  action: AuditAction; // 🔴 Plus de 'string' générique
  metadata: Record<string, unknown> | null; 
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    role: string;
  } | null;
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
        try {
            const res = await api.get('/superadmin/logs');
            
            if (res.data.success) {
                setLogs(res.data.logs);
            }
        } catch (error: unknown) {
            console.error("Erreur Audit:", error);
            // @ts-ignore - On gère l'erreur de type unknown pour l'accès aux propriétés Axios
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                 toast.error("Accès refusé. Admin uniquement.");
                 router.push('/login');
            } else {
                 toast.error("Impossible de charger le registre.");
            }
        } finally {
            setLoading(false);
        }
    };
    fetchLogs();
  }, [router]);

  // FILTRAGE
  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        (log.action || "").toLowerCase().includes(searchLower) ||
        (log.user?.name || "").toLowerCase().includes(searchLower) ||
        (log.user?.email || "").toLowerCase().includes(searchLower) ||
        (log.id || "").toLowerCase().includes(searchLower);

    let matchesDate = true;
    const logDate = new Date(log.createdAt).getTime();

    if (dateStart) matchesDate = matchesDate && logDate >= new Date(dateStart).getTime();
    if (dateEnd) matchesDate = matchesDate && logDate <= new Date(dateEnd).setHours(23, 59, 59);

    return matchesSearch && matchesDate;
  });

  // ✅ NOUVEAU : Déduction intelligente de la catégorie métier
  const getCategory = (action: AuditAction): string => {
      if (action.includes('PAYMENT') || action.includes('CROWDFUNDING')) return 'FINANCE';
      if (action.includes('FRAUD') || action.includes('DELETED')) return 'SECURITY';
      if (action.includes('KYC')) return 'COMPLIANCE';
      return 'SYSTEM';
  };

  // EXPORT CSV INTÉGRAL
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return toast.error("Aucune donnée à exporter.");

    const headers = ["ID_LOG", "DATE_ISO", "CATEGORIE", "UTILISATEUR", "ROLE", "ACTION", "DETAILS"];
    
    const rows = filteredLogs.map(log => [
        `"${log.id}"`,
        `"${new Date(log.createdAt).toISOString()}"`,
        `"${getCategory(log.action)}"`, // ✅ Appel du Helper
        `"${log.user?.name || 'SYSTEM'}"`,
        `"${log.user?.role || 'BOT'}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.metadata ? JSON.stringify(log.metadata).replace(/"/g, "'") : ''}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AUDIT_BABIMMO_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Extraction du registre effectuée.");
  };

  // ✅ Mise à jour pour se baser sur l'action plutôt que l'ancienne catégorie
  const getIcon = (action: AuditAction) => {
      const category = getCategory(action);
      switch(category) {
          case 'FINANCE': return <Banknote className="w-4 h-4 text-emerald-400" />;
          case 'SECURITY': return <ShieldAlert className="w-4 h-4 text-red-500" />;
          case 'COMPLIANCE': return <ShieldCheck className="w-4 h-4 text-blue-500" />;
          default: return <Activity className="w-4 h-4 text-slate-500" />;
      }
  };

  // Helper pour afficher proprement les métadonnées sans 'any'
  const renderMetadata = (meta: Record<string, unknown> | null) => {
    if (!meta || Object.keys(meta).length === 0) return <span className="text-slate-600 italic">-</span>;
    
    // Si c'est un montant (Typage sécurisé)
    if (typeof meta.amount === 'number') {
        return <span className="text-emerald-400 font-bold">{meta.amount.toLocaleString()} FCFA {meta.type ? `(${meta.type})` : ''}</span>;
    }

    // Sinon on affiche un résumé JSON propre
    return <span className="text-slate-500 truncate block max-w-[200px]" title={JSON.stringify(meta)}>{JSON.stringify(meta)}</span>;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Déchiffrement du registre...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 md:p-8 font-sans pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/superadmin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition shadow-lg">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 uppercase">
                        <Fingerprint className="text-orange-500 w-6 h-6" /> Registre d'Audit
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold font-mono mt-1">
                        MASTER_LOG_V5 • {logs.length} ENTRÉES SÉCURISÉES
                    </p>
                </div>
            </div>

            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95"
            >
                <FileSpreadsheet className="w-4 h-4" /> EXPORTER LE REGISTRE (.CSV)
            </button>
        </div>

        {/* FILTRES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input 
                    type="text"
                    placeholder="Rechercher par ID, Nom, Action..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 text-xs text-white focus:border-orange-500 outline-none transition font-mono" 
                />
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input 
                    type="date" 
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 text-xs text-slate-300 focus:border-orange-500 outline-none"
                />
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input 
                    type="date" 
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full bg-[#0B1120] border border-slate-800 rounded-xl py-2.5 pl-10 text-xs text-slate-300 focus:border-orange-500 outline-none"
                />
            </div>
        </div>

        {/* TABLEAU INTÉGRAL */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest font-mono">
                        <tr>
                            <th className="p-4 w-32">Horodatage</th>
                            <th className="p-4 w-24">Catégorie</th>
                            <th className="p-4 w-48">Utilisateur</th>
                            <th className="p-4">Détails de l'action</th>
                            <th className="p-4 text-right">ID Transaction</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/50 transition-colors group">
                                <td className="p-4 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                                    <span className="text-slate-300 font-bold">{new Date(log.createdAt).toLocaleDateString()}</span> <br/>
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 font-black text-[9px] bg-slate-950 w-fit px-2 py-1 rounded border border-slate-800 uppercase tracking-tighter">
                                        {getIcon(log.action)}
                                        {getCategory(log.action)}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-black text-slate-200 text-xs uppercase tracking-tight">
                                        {log.user ? log.user.name : <span className="text-orange-500">🤖 SYSTEM</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
                                        {log.user?.role || 'ROOT'}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <p className="text-emerald-400 font-black text-[11px] uppercase tracking-tighter mb-1">{log.action}</p>
                                    <div className="text-[10px] font-mono">
                                        {renderMetadata(log.metadata)}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <span className="font-mono text-[9px] text-slate-600 bg-slate-950 px-2 py-1 rounded select-all cursor-copy hover:text-orange-400 hover:bg-orange-500/10 transition-colors">
                                        {log.id.split('-')[0].toUpperCase()}...
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {filteredLogs.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600 border border-slate-700">
                        <Search className="w-8 h-8" />
                    </div>
                    <h3 className="text-slate-500 font-black uppercase tracking-widest text-sm">Aucune trace sécurisée</h3>
                    <p className="text-slate-600 text-xs font-mono uppercase mt-1">Vérifiez les paramètres de filtrage</p>
                </div>
            )}
        </div>
    </div>
  );
}
