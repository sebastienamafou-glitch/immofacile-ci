"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { 
  ShieldCheck, Search, CheckCircle, XCircle, Eye, Loader2, FileText, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KycUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  documents: string[]; // Toujours un tableau, jamais null
}

export default function AdminKycPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<KycUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');

  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'ADMIN' ? user : null;
  };

  const fetchKycUsers = async () => {
    const admin = getAdminUser();
    if (!admin) { router.push('/login'); return; }

    try {
        const res = await api.get('/admin/kyc', {
            headers: { 'x-user-email': admin.email }
        });
        
        if (res.data.success) {
            // ✅ SÉCURISATION DES DONNÉES (Nettoyage)
            // On s'assure que 'documents' est toujours un tableau []
            // On s'assure que 'name' n'est jamais vide
            const cleanUsers = (res.data.users || []).map((u: any) => ({
                id: u.id,
                name: u.name || "Utilisateur Inconnu",
                email: u.email || "No Email",
                role: u.role || "USER",
                kycStatus: u.kycStatus || "PENDING",
                documents: Array.isArray(u.documents) ? u.documents : [] 
            }));
            
            setUsers(cleanUsers);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecision = async (userId: string, name: string, decision: 'VERIFIED' | 'REJECTED') => {
    const admin = getAdminUser();
    if (!admin) return;

    const isApprove = decision === 'VERIFIED';

    const result = await Swal.fire({
        title: isApprove ? 'Valider le dossier ?' : 'Rejeter le dossier ?',
        text: isApprove ? `Confirmer l'identité de ${name}` : "L'utilisateur devra resoumettre ses documents.",
        icon: isApprove ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: isApprove ? 'Oui, Valider' : 'Rejeter',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.put('/admin/kyc', 
                { userId, status: decision },
                { headers: { 'x-user-email': admin.email } }
            );
            
            // Mise à jour locale Optimiste
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, kycStatus: decision } : u));
            
            Swal.fire({ 
                title: isApprove ? 'Validé !' : 'Rejeté', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false, 
                background: '#0f172a', color: '#fff' 
            });
        } catch (e) {
            Swal.fire({ title: 'Erreur', icon: 'error', background: '#0f172a', color: '#fff' });
        }
    }
  };

  // Filtrage sécurisé
  const filteredUsers = users.filter(u => filter === 'ALL' ? true : u.kycStatus === 'PENDING');

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500"/>
        <p className="text-sm font-mono text-slate-500">Chargement des dossiers KYC...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 md:p-10 text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" /> Vérifications Identité
            </h1>
            <p className="text-slate-400 mt-1">Conformité et sécurité des utilisateurs.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
                onClick={() => setFilter('PENDING')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'PENDING' ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
                En Attente ({users.filter(u => u.kycStatus === 'PENDING').length})
            </button>
            <button 
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Historique
            </button>
        </div>
      </div>

      {/* LISTE */}
      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                <p>Aucun dossier en attente. Tout est propre !</p>
            </div>
        ) : (
            filteredUsers.map((user) => (
                <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-slate-700 transition-all">
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-400 border border-slate-700 uppercase">
                            {/* ✅ SÉCURITÉ : Fallback si le nom est vide */}
                            {(user.name || "U").charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-white text-lg">{user.name}</h3>
                                {user.kycStatus === 'PENDING' && <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">En Attente</Badge>}
                                {user.kycStatus === 'VERIFIED' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Vérifié</Badge>}
                                {user.kycStatus === 'REJECTED' && <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejeté</Badge>}
                            </div>
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                {user.email} • <span className="font-mono text-slate-400 uppercase text-xs">{user.role}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* ✅ SÉCURITÉ : Vérification robuste du tableau documents */}
                        {user.documents && user.documents.length > 0 ? (
                            <a 
                                href={user.documents[0]} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition"
                            >
                                <FileText className="w-4 h-4" /> Voir Pièce
                            </a>
                        ) : (
                            <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Pas de fichier</span>
                        )}

                        {/* Actions (Uniquement si PENDING) */}
                        {user.kycStatus === 'PENDING' && (
                            <>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'VERIFIED')}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-emerald-900/20"
                                >
                                    <CheckCircle className="w-4 h-4" /> Valider
                                </button>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'REJECTED')}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-bold transition"
                                >
                                    <XCircle className="w-4 h-4" /> Refuser
                                </button>
                            </>
                        )}
                    </div>

                </div>
            ))
        )}
      </div>
    </div>
  );
}
