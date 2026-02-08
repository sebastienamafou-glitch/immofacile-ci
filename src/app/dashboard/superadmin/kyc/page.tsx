"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner"; 
import { 
  ShieldCheck, CheckCircle, XCircle, FileText, AlertTriangle, Loader2, ExternalLink, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ✅ CORRECTION DU TYPAGE : On aligne sur Prisma (documents)
interface KycUser {
  id: string;
  name: string;
  email: string;
  role: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  documents: string[]; // 👈 C'est "documents", pas "kycDocuments"
  createdAt: string;
}

export default function AdminKycPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<KycUser[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING'>('PENDING');

  const fetchKycUsers = async () => {
    try {
        setLoading(true);
        const res = await api.get('/superadmin/kyc'); 
        if (res.data.success) {
            setUsers(res.data.users);
        }
    } catch (error) {
        toast.error("Erreur de chargement des dossiers.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycUsers();
  }, []);

  const handleDecision = async (userId: string, name: string, decision: 'VERIFIED' | 'REJECTED') => {
    const isApprove = decision === 'VERIFIED';

    const result = await Swal.fire({
        title: isApprove ? 'Valider l\'identité ?' : 'Rejeter le dossier ?',
        text: isApprove ? `Confirmer l'identité de ${name}` : `Demander de nouveaux documents à ${name}`,
        icon: isApprove ? 'success' : 'warning',
        showCancelButton: true,
        confirmButtonColor: isApprove ? '#10b981' : '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: isApprove ? 'Oui, Valider' : 'Rejeter',
        background: '#020617', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            // ✅ Optimistic UI : On met à jour l'interface AVANT la réponse serveur
            setUsers(prev => prev.map(u => 
                u.id === userId ? { ...u, kycStatus: decision } : u
            ));

            await api.put('/superadmin/kyc', { userId, status: decision });
            toast.success(`Dossier ${isApprove ? 'validé' : 'rejeté'} avec succès.`);
        } catch (error) {
            toast.error("Erreur lors de la mise à jour.");
            fetchKycUsers(); // On recharge en cas d'erreur
        }
    }
  };

  const filteredUsers = users.filter(u => filter === 'ALL' ? true : u.kycStatus === 'PENDING');

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-slate-200 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-orange-500" /> Vérifications KYC
            </h1>
            <p className="text-slate-400 text-sm">Gérez les identités des utilisateurs.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-lg">
            <button 
                onClick={() => setFilter('PENDING')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'PENDING' ? 'bg-orange-500 text-black' : 'text-slate-400'}`}
            >
                À Traiter ({users.filter(u => u.kycStatus === 'PENDING').length})
            </button>
            <button 
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'ALL' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            >
                Tout voir
            </button>
        </div>
      </div>

      {/* LISTE */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-slate-500">Aucun dossier en attente.</p>
            </div>
        ) : (
            filteredUsers.map((user) => (
                <div key={user.id} className="bg-[#0B1120] border border-white/10 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-center gap-4 hover:border-white/20 transition-all">
                    
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{user.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{user.email}</span>
                                <Badge variant="outline" className="border-white/10 text-slate-300 scale-90 origin-left">{user.role}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* ✅ CORRECTION ICI : user.documents */}
                        {user.documents && user.documents.length > 0 ? (
                            <a 
                                href={user.documents[user.documents.length - 1]} // On prend le dernier envoyé
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition border border-blue-500/20"
                            >
                                <Eye className="w-3.5 h-3.5" /> Voir Pièce
                            </a>
                        ) : (
                            <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3"/> Manquant
                            </span>
                        )}

                        {user.kycStatus === 'PENDING' && (
                            <>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'VERIFIED')}
                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition border border-emerald-500/20"
                                    title="Valider"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDecision(user.id, user.name, 'REJECTED')}
                                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition border border-red-500/20"
                                    title="Rejeter"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </>
                        )}
                         
                        {user.kycStatus === 'VERIFIED' && <Badge className="bg-emerald-500 text-black">Validé</Badge>}
                        {user.kycStatus === 'REJECTED' && <Badge className="bg-red-500 text-white">Rejeté</Badge>}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
