"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner"; 
import { 
  ShieldCheck, CheckCircle, XCircle, FileText, AlertTriangle, Loader2, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ✅ CORRECTION DU TYPAGE (Aligné avec Prisma)
interface KycUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycDocuments: string[]; // ⚠️ C'était 'documents', corrigé en 'kycDocuments'
  createdAt: string;
}

export default function AdminKycPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<KycUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');

  // --- CHARGEMENT DES DONNÉES ---
  const fetchKycUsers = async () => {
    try {
        setLoading(true);
        // ✅ APPEL SÉCURISÉ (Zero Trust)
        const res = await api.get('/superadmin/kyc'); 
        
        if (res.data.success) {
            setUsers(res.data.users);
        }
    } catch (error: any) {
        console.error("Erreur Fetch KYC", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
             toast.error("Session expirée.");
             router.push('/login');
        } else {
             toast.error("Impossible de charger les dossiers.");
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ACTION DE MODÉRATION ---
  const handleDecision = async (userId: string, name: string, decision: 'VERIFIED' | 'REJECTED') => {
    const isApprove = decision === 'VERIFIED';

    const result = await Swal.fire({
        title: isApprove ? 'Valider ce dossier ?' : 'Rejeter ce dossier ?',
        text: isApprove 
            ? `Cela donnera le badge "Vérifié" à ${name}.` 
            : `L'utilisateur ${name} devra resoumettre ses documents.`,
        icon: isApprove ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: isApprove ? 'Oui, Valider' : 'Rejeter',
        cancelButtonText: 'Annuler',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        const toastId = toast.loading("Traitement en cours...");

        try {
            await api.put('/superadmin/kyc', { userId, status: decision });
            
            // Mise à jour Optimiste
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, kycStatus: decision } : u));
            
            toast.success(isApprove ? "Dossier validé !" : "Dossier rejeté.", { id: toastId });

        } catch (error) {
            toast.error("Une erreur est survenue.", { id: toastId });
        }
    }
  };

  const filteredUsers = users.filter(u => filter === 'ALL' ? true : u.kycStatus === 'PENDING');

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500"/>
        <p className="text-sm font-mono text-slate-500 animate-pulse">Analyse biométrique en cours...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-8 text-slate-200 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                <ShieldCheck className="w-8 h-8 text-emerald-500" /> Conformité KYC
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
                Vérification des identités (CNI, Passeport).
            </p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
                onClick={() => setFilter('PENDING')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'PENDING' ? 'bg-[#F59E0B] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <AlertTriangle className="w-3 h-3"/> À Traiter ({users.filter(u => u.kycStatus === 'PENDING').length})
            </button>
            <button 
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Historique
            </button>
        </div>
      </div>

      {/* LISTE */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <CheckCircle className="w-16 h-16 mb-4 text-emerald-500/20" />
                <p className="text-lg font-bold text-white">Aucun dossier en attente</p>
            </div>
        ) : (
            filteredUsers.map((user) => (
                <div key={user.id} className="bg-[#0B1120] border border-white/10 rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:border-white/20 transition-all shadow-lg shadow-black/20">
                    
                    {/* INFO */}
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center font-black text-xl text-slate-300 border border-white/10">
                            {(user.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-white text-lg tracking-tight">{user.name}</h3>
                                {user.kycStatus === 'PENDING' && <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20">En Attente</Badge>}
                                {user.kycStatus === 'VERIFIED' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Vérifié</Badge>}
                                {user.kycStatus === 'REJECTED' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejeté</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                                <span>{user.email}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                <span className="uppercase text-slate-400 font-bold">{user.role}</span>
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        
                        {/* ✅ CORRECTION ICI : user.kycDocuments au lieu de user.documents */}
                        {user.kycDocuments && user.kycDocuments.length > 0 ? (
                            <a 
                                href={user.kycDocuments[0]} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-blue-500/10 hover:text-blue-400 text-slate-300 border border-white/10 hover:border-blue-500/30 rounded-xl text-xs font-bold transition"
                            >
                                <FileText className="w-4 h-4" /> 
                                <span>Pièce d'identité</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                            </a>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-xl text-xs font-bold cursor-not-allowed">
                                <AlertTriangle className="w-4 h-4"/> Document Manquant
                            </div>
                        )}

                        {user.kycStatus === 'PENDING' && (
                            <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'VERIFIED')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
                                >
                                    <CheckCircle className="w-4 h-4" /> Valider
                                </button>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'REJECTED')}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 border border-white/10 hover:border-red-500 rounded-xl text-xs font-bold transition hover:scale-105 active:scale-95"
                                >
                                    <XCircle className="w-4 h-4" /> Refuser
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            ))
        )}
      </div>
    </div>
  );
}
