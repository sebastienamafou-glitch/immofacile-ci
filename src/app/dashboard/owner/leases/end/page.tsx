"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Calculator, AlertTriangle, CheckCircle2, 
  Home, Ban, UserMinus, Loader2, ArrowLeft 
} from "lucide-react";
import Link from "next/link";
import { Lease, Property, User } from "@prisma/client";

// Types étendus pour le Frontend
type LeaseWithDetails = Lease & {
    property: Property;
    tenant: User;
};

type EndLeaseResult = {
    success: boolean;
    refundAmount: number;
    isGoodTenant: boolean;
    rehousingProposals: Property[];
};

export default function EndLeasePage() {
  const router = useRouter();
  
  // États de données
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États de formulaire
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [deduction, setDeduction] = useState<string>("0"); // String pour input control
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // État de résultat (Succès)
  const [resultData, setResultData] = useState<EndLeaseResult | null>(null);

  // 1. CHARGER LES BAUX ACTIFS
  useEffect(() => {
    const fetchLeases = async () => {
      try {
        // ✅ APPEL SÉCURISÉ : Zero Trust (Cookie Only)
        const res = await api.get('/owner/leases');
        
        if (res.data.success) {
          // Filtrage Client : Uniquement les baux actifs
          const activeLeases = res.data.leases.filter((l: LeaseWithDetails) => l.isActive);
          setLeases(activeLeases);
        }
      } catch (error) {
        console.error("Erreur chargement", error);
        toast.error("Impossible de charger vos contrats.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, []);

  // Calculs dynamiques pour l'UI
  const selectedLease = leases.find(l => l.id === selectedLeaseId);
  const deposit = selectedLease ? selectedLease.depositAmount : 0;
  const numericDeduction = Number(deduction) || 0;
  const refundAmount = Math.max(0, deposit - numericDeduction); 

  // 2. SOUMETTRE LA CLÔTURE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) return;

    if (numericDeduction > deposit) {
        toast.error("La retenue dépasse le montant de la caution !");
        return;
    }

    setSubmitting(true);

    try {
      // ✅ APPEL API PRODUCTION
      const res = await api.post('/owner/leases/end', {
        leaseId: selectedLeaseId,
        deduction: numericDeduction,
        comment: comment.trim()
      });

      if (res.data.success) {
        setResultData(res.data); 
        toast.success("Bail clôturé et comptes soldés !");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de la clôture.");
      setSubmitting(false);
    }
  };

  // --- VUE RÉSULTAT (SUCCÈS) ---
  if (resultData) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Clôture Effectuée</h2>
            <p className="text-slate-400">Le bail est résilié. Le bien est à nouveau disponible.</p>
          </div>

          <div className="bg-slate-950 rounded-2xl p-6 mb-8 border border-white/5 flex justify-between items-center shadow-inner">
            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Solde reversé au locataire</span>
            <span className="text-3xl font-black text-white tracking-tight">{resultData.refundAmount?.toLocaleString()} FCFA</span>
          </div>

          {/* RELOGEMENT INTELLIGENT */}
          {resultData.isGoodTenant && resultData.rehousingProposals?.length > 0 ? (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
              <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-4">
                <Home className="w-5 h-5" /> Opportunité de Relogement
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                Ce locataire est un bon payeur. Proposez-lui un bien vacant :
              </p>
              <div className="space-y-3">
                {resultData.rehousingProposals.map((prop) => (
                  <div key={prop.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-blue-500/50 transition cursor-pointer group">
                    <div>
                      <p className="font-bold text-white group-hover:text-blue-400 transition">{prop.title}</p>
                      <p className="text-xs text-slate-500">{prop.commune}</p>
                    </div>
                    <span className="text-orange-500 font-bold text-sm">{prop.price.toLocaleString()} F</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button 
            onClick={() => router.push('/dashboard/owner')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition border border-slate-700"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </div>
    );
  }

  // --- VUE FORMULAIRE (DÉFAUT) ---
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8">
            <Link href="/dashboard/owner/leases" className="inline-flex items-center text-slate-400 hover:text-white gap-2 transition text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Annuler
            </Link>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase italic tracking-tight">
                <UserMinus className="text-red-500 w-8 h-8" /> Fin de Bail
            </h1>
            <p className="text-slate-500 text-sm font-bold mt-2">État des lieux de sortie & Solde de tout compte</p>
        </div>

        {loading ? (
            <div className="text-center py-32"><Loader2 className="animate-spin w-12 h-12 mx-auto text-[#F59E0B]"/></div>
        ) : leases.length === 0 ? (
            <div className="bg-slate-900 p-16 rounded-3xl text-center border border-dashed border-slate-700">
                <Ban className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Aucun contrat actif</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Vous n'avez aucun bail en cours à clôturer.</p>
                <Link href="/dashboard/owner/leases/new" className="mt-6 inline-block text-orange-500 font-bold hover:underline">
                    Créer un nouveau bail
                </Link>
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* FORMULAIRE */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SÉLECTEUR DE BAIL */}
              <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Contrat à clôturer</label>
                <select 
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none font-bold"
                  value={selectedLeaseId}
                  onChange={(e) => {
                      setSelectedLeaseId(e.target.value);
                      setDeduction("0");
                  }}
                  required
                >
                  <option value="">-- Sélectionner un locataire --</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      {lease.tenant.name} — {lease.property.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* SECTION FINANCIÈRE */}
              {selectedLease && (
                <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg">
                    <Calculator className="text-[#F59E0B] w-5 h-5" /> Retenues & Dégradations
                  </h3>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Montant à retenir (FCFA)</label>
                    <input 
                        type="number" 
                        min="0"
                        max={deposit}
                        value={deduction}
                        onChange={(e) => setDeduction(e.target.value)}
                        className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white font-mono font-bold text-xl focus:border-red-500 transition-colors"
                        placeholder="0"
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-slate-500">Caution disponible : {deposit.toLocaleString()} F</p>
                        {numericDeduction > deposit && <p className="text-[10px] text-red-500 font-bold animate-pulse">Montant excessif !</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motif de la retenue</label>
                    <textarea 
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ex: Réparation serrure, Peinture salon, Ménage..."
                        className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[#F59E0B] outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={!selectedLeaseId || submitting || numericDeduction > deposit}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Ban className="w-5 h-5" />}
                {submitting ? "Finalisation..." : "Valider la Sortie"}
              </button>
            </form>

            {/* SIMULATEUR TEMPS RÉEL */}
            <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-[2rem] relative overflow-hidden shadow-2xl">
                    <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Bilan de Sortie</p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-slate-400 font-medium">Caution Initiale</span>
                            <span className="font-mono font-bold text-white text-lg">
                                {deposit.toLocaleString()} <span className="text-xs text-slate-600">F</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-red-400 flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4" /> Retenues</span>
                            <span className="font-mono font-bold text-red-400 text-lg">
                                - {numericDeduction.toLocaleString()} <span className="text-xs text-red-900">F</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-emerald-400 font-bold uppercase text-sm tracking-wide">Reste à rendre</span>
                            <span className="font-mono font-black text-emerald-400 text-4xl">
                                {refundAmount.toLocaleString()} <span className="text-sm font-bold text-emerald-600">F</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
