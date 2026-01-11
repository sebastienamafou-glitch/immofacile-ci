"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, CheckCircle, XCircle, TrendingUp, ArrowRight, Loader2, Wallet,
  AlertCircle, ShieldCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Candidate {
  id: string;
  createdAt: string;
  monthlyRent: number;
  status: string;
  tenant: {
    id: string;
    name: string;
    phone: string;
    email: string;
    walletBalance: number;
    kycStatus: string;
  };
  property: {
    id: string;
    title: string;
    price: number;
  };
  trustScore?: {
    score: number;
    grade: string;
    details: string[];
  };
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 1. CHARGEMENT SÉCURISÉ
  const fetchCandidates = async () => {
    const stored = localStorage.getItem("immouser");
    if (!stored) { router.push('/login'); return; }
    const user = JSON.parse(stored);

    try {
        // ✅ AJOUT DU HEADER SECURITY
        const res = await api.get('/owner/candidates', {
            headers: { 'x-user-email': user.email }
        });
        if (res.data.success) {
            setCandidates(res.data.candidates);
        }
    } catch (error) {
        console.error("Erreur chargement candidats", error);
        toast.error("Impossible de charger les candidatures.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // 2. ACTION SÉCURISÉE
  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedCandidate) return;
    
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    setProcessing(true);

    try {
        // ✅ AJOUT DU HEADER SECURITY
        await api.post('/owner/candidates/review', {
            leaseId: selectedCandidate.id,
            decision: decision
        }, {
            headers: { 'x-user-email': user.email }
        });

        if (decision === 'APPROVED') {
            toast.success(`${selectedCandidate.tenant.name} a été accepté !`);
        } else {
            toast.info("Candidature refusée.");
        }
        
        setSelectedCandidate(null);
        fetchCandidates(); // Recharger la liste

    } catch (error: any) {
        toast.error(error.response?.data?.error || "Une erreur est survenue.");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center bg-[#0B1120]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 p-6 max-w-6xl mx-auto min-h-screen bg-[#0B1120]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recrutement</h2>
            <p className="text-white text-3xl font-black flex items-center gap-2">
                <Users className="text-[#F59E0B]" /> Candidatures Reçues
            </p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-900 px-4 py-1">
                En attente: {candidates.length}
            </Badge>
        </div>
      </div>

      {/* LISTE DES CANDIDATS */}
      {candidates.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
              <Users className="w-16 h-16 text-slate-700 mx-auto mb-4"/>
              <p className="text-slate-400 font-bold text-lg">Aucune candidature en attente</p>
              <p className="text-slate-600 text-sm mt-2">Dès qu'un locataire postule, il apparaîtra ici avec son score.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-4">
            {candidates.map((candidate) => (
                <Card key={candidate.id} className="bg-slate-900 border-slate-800 hover:border-[#F59E0B]/50 transition cursor-pointer group" onClick={() => setSelectedCandidate(candidate)}>
                    <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        
                        {/* GAUCHE : INFO CANDIDAT */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl text-white">
                                {candidate.tenant.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{candidate.tenant.name}</h3>
                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                    Candidat pour : <span className="text-[#F59E0B] font-medium">{candidate.property.title}</span>
                                </p>
                            </div>
                        </div>

                        {/* CENTRE : TRUST SCORE & FINANCES */}
                        <div className="flex-1 w-full md:w-auto flex items-center justify-end gap-8 bg-slate-950/50 p-2 rounded-xl border border-white/5">
                            
                            <div className="hidden md:block text-right border-r border-white/10 pr-4">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Solde Wallet</p>
                                <p className="font-bold text-slate-300 flex items-center justify-end gap-1">
                                    <Wallet className="w-3 h-3"/> {candidate.tenant.walletBalance.toLocaleString()} F
                                </p>
                            </div>

                            <div className="flex flex-col items-end">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Confiance</p>
                                <div className="flex items-center gap-2">
                                    <div className={`
                                        flex items-center justify-center w-10 h-10 rounded-full font-black text-lg border-2 shadow-lg
                                        ${candidate.trustScore?.grade === 'A' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10 shadow-emerald-900/20' : ''}
                                        ${candidate.trustScore?.grade === 'B' ? 'border-orange-500 text-orange-500 bg-orange-500/10 shadow-orange-900/20' : ''}
                                        ${candidate.trustScore?.grade === 'C' ? 'border-red-500 text-red-500 bg-red-500/10 shadow-red-900/20' : ''}
                                        ${!candidate.trustScore ? 'border-slate-600 text-slate-600' : ''}
                                    `}>
                                        {candidate.trustScore?.score || 0}
                                    </div>
                                    <div className="hidden lg:block text-right">
                                        <p className={`text-sm font-bold leading-none
                                            ${candidate.trustScore?.grade === 'A' ? 'text-emerald-500' : ''}
                                            ${candidate.trustScore?.grade === 'B' ? 'text-orange-500' : ''}
                                            ${candidate.trustScore?.grade === 'C' ? 'text-red-500' : ''}
                                        `}>
                                            Niveau {candidate.trustScore?.grade || '?'}
                                        </p>
                                        <p className="text-[9px] text-slate-500">Score Algorithmique</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pl-2">
                            <ArrowRight className="text-slate-600 group-hover:text-white transition" />
                        </div>

                    </CardContent>
                </Card>
            ))}
          </div>
      )}

      {/* MODAL DÉTAILS CANDIDAT */}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
            {selectedCandidate && (
                <>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {selectedCandidate.tenant.name}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Analyse du dossier pour <b>{selectedCandidate.property.title}</b>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* SCORE DÉTAILLÉ */}
                        {selectedCandidate.trustScore && (
                             <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-[#F59E0B]" /> 
                                        Score de Confiance : <span className="text-[#F59E0B]">{selectedCandidate.trustScore.score}/100</span>
                                    </h4>
                                    <Badge className={`
                                        ${selectedCandidate.trustScore.grade === 'A' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                                        ${selectedCandidate.trustScore.grade === 'B' ? 'bg-orange-500/20 text-orange-400' : ''}
                                        ${selectedCandidate.trustScore.grade === 'C' ? 'bg-red-500/20 text-red-400' : ''}
                                    `}>Grade {selectedCandidate.trustScore.grade}</Badge>
                                </div>
                                <ul className="space-y-2">
                                    {selectedCandidate.trustScore.details.map((detail, idx) => (
                                        <li key={idx} className="text-xs text-slate-300 flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition">
                                            {detail.includes('✅') && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0"/>}
                                            {detail.includes('⚠️') && <AlertCircle className="w-3 h-3 text-orange-500 shrink-0"/>}
                                            {detail.includes('❌') && <XCircle className="w-3 h-3 text-red-500 shrink-0"/>}
                                            {detail.includes('💰') && <Wallet className="w-3 h-3 text-blue-500 shrink-0"/>}
                                            <span>{detail.replace(/✅|⚠️|❌|💰/g, '').trim()}</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                        )}

                        <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/10">
                            <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Capacité Financière
                            </h4>
                            <ul className="space-y-1 text-sm text-slate-300">
                                <li className="flex justify-between">
                                    <span>Loyer du bien :</span>
                                    <b>{selectedCandidate.monthlyRent.toLocaleString()} FCFA</b>
                                </li>
                                <li className="flex justify-between">
                                    <span>Solde Wallet actuel :</span>
                                    <b className="text-emerald-400">{selectedCandidate.tenant.walletBalance.toLocaleString()} FCFA</b>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 pt-2">
                        <Button 
                            variant="destructive" 
                            disabled={processing}
                            onClick={() => handleDecision('REJECTED')}
                            className="flex-1 bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50 font-bold"
                        >
                            <XCircle className="w-4 h-4 mr-2" /> Refuser
                        </Button>
                        <Button 
                            disabled={processing}
                            className="flex-1 bg-[#F59E0B] hover:bg-orange-500 text-black font-black"
                            onClick={() => handleDecision('APPROVED')}
                        >
                            {processing ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2" />}
                            ACCEPTER LE DOSSIER
                        </Button>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
