"use client";

import Swal from "sweetalert2";
import { ShieldCheck, CheckCircle, XCircle, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface KycManagerProps {
  kycList: any[];
  kycCount: number;
  onUpdate: React.Dispatch<React.SetStateAction<any>>;
}

export default function KycManager({ kycList, kycCount, onUpdate }: KycManagerProps) {

  const handleValidateKyc = async (userId: string, userName: string) => {
    const result = await Swal.fire({
        title: 'Valider ce dossier ?',
        text: `Vous allez certifier l'identité de ${userName}. Cette action débloquera ses droits.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, Certifier',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#334155',
        background: '#0F172A', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.put('/superadmin/kyc', { userId, status: 'VERIFIED' });
            
            // Mise à jour de l'état global du Dashboard
            onUpdate((prev: any) => ({
                ...prev,
                stats: { 
                    ...prev.stats, 
                    ops: { ...prev.stats.ops, kycCount: Math.max(0, prev.stats.ops.kycCount - 1) } 
                },
                lists: { 
                    ...prev.lists, 
                    pendingKycs: prev.lists.pendingKycs.filter((k: any) => k.id !== userId) 
                }
            }));

            Swal.fire({ 
                icon: 'success', 
                title: 'Utilisateur Certifié !', 
                toast: true, position: 'top-end', 
                showConfirmButton: false, timer: 2000, 
                background: '#0F172A', color: '#fff' 
            });

        } catch (e) { 
            Swal.fire({ icon: 'error', title: 'Erreur Serveur', background: '#0F172A', color: '#fff' }); 
        }
    }
  };

  const handleRejectKyc = async (userId: string) => {
      const { value: reason } = await Swal.fire({
        title: 'Refuser le dossier',
        input: 'text',
        inputLabel: 'Motif du rejet',
        inputPlaceholder: 'Ex: Document illisible, expiré...',
        showCancelButton: true,
        confirmButtonText: 'Refuser',
        confirmButtonColor: '#EF4444',
        background: '#0F172A', color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'Le motif est obligatoire !'
        }
      });

      if (reason) {
        try {
            await api.put('/superadmin/kyc', { userId, status: 'REJECTED', reason });
            
            onUpdate((prev: any) => ({
                ...prev,
                stats: { ...prev.stats, ops: { ...prev.stats.ops, kycCount: Math.max(0, prev.stats.ops.kycCount - 1) } },
                lists: { ...prev.lists, pendingKycs: prev.lists.pendingKycs.filter((k: any) => k.id !== userId) }
            }));

            Swal.fire({ icon: 'info', title: 'Dossier Rejeté', toast: true, position: 'top-end', timer: 2000, background: '#0F172A', color: '#fff' });
        } catch (e) {
             Swal.fire({ icon: 'error', title: 'Erreur', background: '#0F172A', color: '#fff' });
        }
      }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[400px]">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-white text-sm flex gap-2 items-center">
                <ShieldCheck className="text-orange-500 w-4 h-4"/> VALIDATION KYC
            </h3>
            <span className="bg-orange-500 text-black px-2 py-0.5 rounded text-[10px] font-black">{kycCount}</span>
        </div>

        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {kycList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 opacity-50">
                    <CheckCircle className="w-12 h-12"/>
                    <span className="text-xs font-bold">Tout est à jour</span>
                </div>
            ) : (
                kycList.map((k: any) => (
                    <div key={k.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-3 group hover:border-orange-500/30 transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-bold text-sm text-white">{k.name}</div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded w-fit mt-1">{k.role}</div>
                            </div>
                            {k.docUrl && (
                                <a 
                                    href={k.docUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-blue-600 hover:text-white text-slate-400 transition"
                                    title="Voir la pièce d'identité"
                                >
                                    <Eye className="w-4 h-4"/>
                                </a>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <button 
                                onClick={() => handleRejectKyc(k.id)} 
                                className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase transition"
                            >
                                <XCircle className="w-3 h-3"/> Rejeter
                            </button>
                            <button 
                                onClick={() => handleValidateKyc(k.id, k.name)} 
                                className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase transition"
                            >
                                <CheckCircle className="w-3 h-3"/> Valider
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
}
