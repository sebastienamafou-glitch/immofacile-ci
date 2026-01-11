"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, endLeaseWithProposals } from "@/lib/api";
import { toast } from "sonner";
import { 
  Calculator, AlertTriangle, CheckCircle2, ArrowRight, 
  Home, Ban, Banknote, UserMinus, Loader2 
} from "lucide-react";

export default function EndLeasePage() {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // État du formulaire
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [deduction, setDeduction] = useState<number>(0);
  const [comment, setComment] = useState("");
  
  // Résultat après soumission (pour afficher les propositions)
  const [resultData, setResultData] = useState<any>(null);

  // 1. Charger les baux actifs
  useEffect(() => {
    const fetchLeases = async () => {
      try {
        const res = await api.get('/owner/leases');
        if (res.data.success) {
          // On ne garde que les baux ACTIFS
          const activeLeases = res.data.leases.filter((l: any) => l.isActive);
          setLeases(activeLeases);
        }
      } catch (error) {
        console.error("Erreur chargement baux", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, []);

  // Trouver le bail sélectionné pour avoir les infos (Caution, Loyer...)
  const selectedLease = leases.find(l => l.id === selectedLeaseId);
  const deposit = selectedLease ? selectedLease.depositAmount : 0;
  const refundAmount = Math.max(0, deposit - deduction); // On ne peut pas rembourser en négatif

  // 2. Soumettre la clôture
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) return;

    setSubmitting(true);
    try {
      const res = await endLeaseWithProposals({
        leaseId: selectedLeaseId,
        deduction,
        comment
      });

      if (res.data.success) {
        setResultData(res.data); // On stocke le résultat pour l'affichage final
        toast.success("Bail clôturé avec succès");
      }
    } catch (error: any) {
      toast.error("Erreur", { description: error.response?.data?.error || "Impossible de clôturer." });
      setSubmitting(false);
    }
  };

  // --- VUE SUCCÈS (APRÈS CLÔTURE) ---
  if (resultData) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Bail Clôturé !</h2>
            <p className="text-slate-400">Le locataire a été notifié et la caution libérée.</p>
          </div>

          <div className="bg-slate-950 rounded-2xl p-6 mb-8 border border-white/5 flex justify-between items-center">
            <span className="text-slate-500 font-bold uppercase text-xs">Reste à payer (Locataire)</span>
            <span className="text-2xl font-black text-white">{resultData.refundAmount?.toLocaleString()} FCFA</span>
          </div>

          {/* LOGIQUE INTELLIGENTE : RELOGEMENT */}
          {resultData.isGoodTenant && resultData.rehousingProposals?.length > 0 ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
              <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-4">
                <Home className="w-5 h-5" /> Opportunité de Relogement
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                Ce locataire a pris soin de votre bien (peu de retenues). Voici vos biens vacants disponibles :
              </p>
              <div className="space-y-3">
                {resultData.rehousingProposals.map((prop: any) => (
                  <div key={prop.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-blue-500/50 transition cursor-pointer">
                    <div>
                      <p className="font-bold text-white">{prop.title}</p>
                      <p className="text-xs text-slate-500">{prop.commune}</p>
                    </div>
                    <span className="text-orange-500 font-bold text-sm">{prop.price.toLocaleString()} F</span>
                  </div>
                ))}
              </div>
              <button onClick={() => toast.info("Proposition envoyée au locataire !")} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">
                Envoyer une offre de relogement
              </button>
            </div>
          ) : (
             // Si mauvais locataire ou pas de biens dispo
             <div className="text-center text-slate-500 text-sm italic mb-8">
                Aucune proposition de relogement disponible ou nécessaire.
             </div>
          )}

          <button 
            onClick={() => router.push('/dashboard/owner')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition"
          >
            Retour au Tableau de Bord
          </button>
        </div>
      </div>
    );
  }

  // --- VUE FORMULAIRE ---
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase italic">
            <UserMinus className="text-red-500 w-8 h-8" /> Sortie de Locataire
          </h1>
          <p className="text-slate-500 text-sm font-bold mt-1">Check-out, calcul de caution et clôture administrative</p>
        </div>

        {loading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin w-10 h-10 mx-auto text-orange-500"/></div>
        ) : leases.length === 0 ? (
            <div className="bg-slate-900 p-10 rounded-3xl text-center border border-dashed border-slate-700">
                <p>Aucun bail actif à clôturer.</p>
                <button onClick={() => router.back()} className="mt-4 text-orange-500 font-bold hover:underline">Retour</button>
            </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLONNE GAUCHE : SAISIE */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. SÉLECTION DU BAIL */}
              <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Sélectionner le locataire</label>
                <select 
                  className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                  value={selectedLeaseId}
                  onChange={(e) => {
                      setSelectedLeaseId(e.target.value);
                      setDeduction(0); // Reset deduction si changement
                  }}
                  required
                >
                  <option value="">-- Choisir un contrat --</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      {lease.tenant.name} — {lease.property.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. DÉDUCTIONS (Si bail sélectionné) */}
              {selectedLease && (
                <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl animate-in slide-in-from-bottom-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-6">
                    <Calculator className="text-orange-500 w-5 h-5" /> Retenues sur Caution
                  </h3>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Montant à déduire (Dégâts, impayés)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-500 font-bold">FCFA</span>
                        <input 
                            type="number" 
                            min="0"
                            max={deposit}
                            value={deduction}
                            onChange={(e) => setDeduction(Number(e.target.value))}
                            className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-16 pr-4 py-3 text-white font-mono font-bold text-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                        Max autorisé : {deposit.toLocaleString()} F (Montant de la caution)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motif de la retenue / Commentaire</label>
                    <textarea 
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ex: Peinture salon abîmée, clé perdue..."
                        className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={!selectedLeaseId || submitting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Ban className="w-5 h-5" />}
                {submitting ? "Traitement..." : "Clôturer le Bail Définitivement"}
              </button>

            </form>

            {/* COLONNE DROITE : SIMULATION EN TEMPS RÉEL */}
            <div className="flex flex-col gap-6">
                
                {/* CARTE BILAN FINANCIER */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-[2rem] relative overflow-hidden">
                    <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Bilan de Sortie</p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-slate-400">Caution Initiale</span>
                            <span className="font-mono font-bold text-white text-lg">
                                {deposit.toLocaleString()} <span className="text-xs text-slate-600">F</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                            <span className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Retenues</span>
                            <span className="font-mono font-bold text-red-400 text-lg">
                                - {deduction.toLocaleString()} <span className="text-xs text-red-900">F</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-emerald-400 font-bold uppercase text-sm">À Rembourser</span>
                            <span className="font-mono font-black text-emerald-400 text-3xl">
                                {refundAmount.toLocaleString()} <span className="text-sm">F</span>
                            </span>
                        </div>
                    </div>

                    {/* INDICATEUR VISUEL DE "QUALITÉ" LOCATAIRE */}
                    {selectedLease && (
                        <div className={`mt-8 p-4 rounded-xl border ${deduction > deposit * 0.2 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex items-start gap-3 transition-colors`}>
                            {deduction > deposit * 0.2 ? (
                                <>
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-red-500 text-sm">Dégâts importants</p>
                                        <p className="text-xs text-red-400/80">Le montant des retenues dépasse 20% de la caution.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Banknote className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-emerald-500 text-sm">Bon Payeur</p>
                                        <p className="text-xs text-emerald-400/80">Faible retenue. Ce locataire est éligible au relogement prioritaire.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* INFO SÉQUESTRE */}
                <div className="bg-[#0B1120] border border-slate-800 p-6 rounded-2xl text-xs text-slate-500 leading-relaxed">
                    <p className="mb-2"><strong className="text-slate-300">Note :</strong> En validant, le montant du remboursement sera crédité sur le portefeuille du locataire et les retenues seront transférées sur votre solde disponible.</p>
                    <p>Cette action est irréversible et libère immédiatement le bien pour une nouvelle location.</p>
                </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
