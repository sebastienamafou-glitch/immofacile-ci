"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner"; 
import { 
  ShieldCheck, CheckCircle, XCircle, FileText, AlertTriangle, Loader2, Eye, Search, Filter, Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ✅ TYPE COMPLET (Aligné avec Prisma + Numéro)
interface KycUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kyc: {
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    documents: string[];
    rejectionReason?: string | null;
    updatedAt: string;
    idType?: string;   // AJOUT
    idNumber?: string; // AJOUT (Sera déchiffré par l'API)
  } | null;
}

export default function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<KycUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');
  const [search, setSearch] = useState("");

  // CHARGEMENT DES DONNÉES
  const fetchKycUsers = async () => {
    try {
        setLoading(true);
        const res = await api.get('/superadmin/kyc/list'); 
        if (res.data.success) {
            setUsers(res.data.users);
        }
    } catch (error) {
        toast.error("Impossible de charger les dossiers.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycUsers();
  }, []);

  // ACTION DE VALIDATION / REJET
  const handleDecision = async (userId: string, name: string, decision: 'VERIFIED' | 'REJECTED') => {
    const isApprove = decision === 'VERIFIED';
    let rejectionReason = "";

    if (!isApprove) {
        const { value: text, isDismissed } = await Swal.fire({
            title: 'Motif du rejet',
            input: 'textarea',
            inputLabel: `Pourquoi refusez-vous le dossier de ${name} ?`,
            inputPlaceholder: 'Ex: Photo illisible, document expiré...',
            showCancelButton: true,
            confirmButtonText: 'Rejeter le dossier',
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Annuler',
            background: '#0F172A', color: '#fff',
            inputValidator: (value) => {
                if (!value) return 'Le motif est obligatoire pour informer l\'utilisateur !'
            }
        });

        if (isDismissed || !text) return;
        rejectionReason = text;
    } else {
        const result = await Swal.fire({
            title: 'Confirmer l\'identité ?',
            text: `Vous allez valider le dossier de ${name}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Oui, Certifier',
            background: '#0F172A', color: '#fff'
        });
        if (!result.isConfirmed) return;
    }

    try {
        setUsers(prev => prev.map(u => 
            u.id === userId && u.kyc ? { ...u, kyc: { ...u.kyc!, status: decision, rejectionReason } } : u
        ));

        await api.put('/superadmin/kyc/update', { 
            userId, 
            status: decision, 
            reason: rejectionReason 
        });
        
        toast.success(`Dossier de ${name} ${isApprove ? 'validé' : 'rejeté'}.`);
    } catch (error) {
        toast.error("Erreur serveur. Annulation...");
        fetchKycUsers();
    }
  };

  const filteredUsers = users.filter(u => {
      const matchesFilter = filter === 'ALL' ? true : u.kyc?.status === 'PENDING';
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
  });

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-slate-200 font-sans pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                <ShieldCheck className="w-6 h-6 text-orange-500" /> Centre de Validation KYC
            </h1>
            <p className="text-slate-400 text-sm">Données chiffrées (AES-256) & Sécurisées.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-slate-950 border-none rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-white focus:ring-1 focus:ring-orange-500 w-48 transition"
                />
            </div>
            <div className="h-6 w-[1px] bg-slate-800"></div>
            <div className="flex gap-1">
                <button 
                    onClick={() => setFilter('PENDING')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${filter === 'PENDING' ? 'bg-orange-500 text-black shadow-lg shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Filter className="w-3 h-3" /> À Traiter ({users.filter(u => u.kyc?.status === 'PENDING').length})
                </button>
                <button 
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    Historique
                </button>
            </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <CheckCircle className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-500 font-medium">Aucun dossier en attente.</p>
            </div>
        ) : (
            filteredUsers.map((user) => (
                <div key={user.id} className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-orange-500/20 transition-all group shadow-lg">
                    
                    <div className="flex items-center gap-5 w-full lg:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border ${user.kyc?.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-white text-lg">{user.name}</h3>
                                <Badge variant="outline" className="border-slate-700 bg-slate-900 text-xs py-0 h-5 text-slate-400">{user.role}</Badge>
                            </div>
                            
                            {/* 👇 AFFICHAGE DU NUMÉRO CHIFFRÉ */}
                            <div className="flex items-center gap-3 mt-1.5 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Lock className="w-3 h-3 text-emerald-500" />
                                    <span className="uppercase font-bold tracking-wider text-slate-500">{user.kyc?.idType || 'ID'}</span>
                                </div>
                                <div className="h-3 w-[1px] bg-slate-700"></div>
                                <code className="text-sm font-mono text-emerald-400 font-bold tracking-widest">
                                    {user.kyc?.idNumber || '••••••••'}
                                </code>
                            </div>

                            <p className="text-[10px] text-slate-600 mt-1">
                                Soumis le : {user.kyc?.updatedAt ? new Date(user.kyc.updatedAt).toLocaleDateString() : 'Date inconnue'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                        {user.kyc && user.kyc.documents.length > 0 ? (
                            <a 
                                href={user.kyc.documents[user.kyc.documents.length - 1]} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/btn flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-xs font-bold transition border border-slate-700 hover:border-blue-500"
                            >
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">Preuve</span>
                            </a>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-red-500"/>
                                <span className="text-xs font-bold text-red-500">Manquant</span>
                            </div>
                        )}

                        {user.kyc?.status === 'PENDING' ? (
                            <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'REJECTED')}
                                    className="p-3 bg-slate-900 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition border border-slate-800 hover:border-red-600 shadow-lg active:scale-95"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'VERIFIED')}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95"
                                >
                                    <CheckCircle className="w-4 h-4" /> Valider
                                </button>
                            </div>
                        ) : (
                            <div className="pl-4 border-l border-slate-800">
                                {user.kyc?.status === 'VERIFIED' && (
                                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 font-bold text-xs">
                                        <CheckCircle className="w-4 h-4"/> VALIDÉ
                                    </div>
                                )}
                                {user.kyc?.status === 'REJECTED' && (
                                    <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 font-bold text-xs">
                                        <XCircle className="w-4 h-4"/> REJETÉ
                                    </div>
                                )}
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
