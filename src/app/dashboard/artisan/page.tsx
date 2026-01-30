"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api"; 
import { formatCurrency } from "@/lib/utils"; 
import { toast } from "sonner";
import { 
  MapPin, CheckCircle, XCircle, Loader2, Wrench, Clock, 
  DollarSign, Play, Camera, Phone 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CompleteJobModal from "@/components/artisan/CompleteJobModal";

// --- TYPES ---
interface Job {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  address: string;
  reporterName?: string;
  reporterPhone?: string;
  quoteAmount?: number;
  createdAt: string;
}

interface ArtisanData {
  user: {
    name: string;
    email: string;
    walletBalance: number;
    isAvailable: boolean;
  };
  stats: any;
  jobs: Job[];
}

export default function ArtisanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ArtisanData | null>(null);
  
  // États Modale
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchDashboard = async () => {
    try {
        const res = await api.get('/artisan/dashboard');
        if (res.data.success) {
            setData(res.data);
        }
    } catch (error: any) {
        if (error.response?.status === 401) {
             router.push('/login');
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  // --- ACTIONS ---
  const toggleAvailability = async () => {
    if (!data) return;
    try {
        const newStatus = !data.user.isAvailable;
        setData({ ...data, user: { ...data.user, isAvailable: newStatus } });
        await api.post('/artisan/status', { available: newStatus });
        toast.success(newStatus ? "Vous êtes EN LIGNE." : "Vous êtes HORS LIGNE.");
    } catch (error) { fetchDashboard(); }
  };

  const handleJobAction = async (jobId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
        await api.post(`/artisan/jobs/action`, { jobId, action });
        if (action === 'ACCEPT') toast.success("Chantier accepté !");
        if (action === 'REJECT') toast.info("Offre déclinée.");
        fetchDashboard(); 
    } catch (error: any) {
        toast.error("Action impossible.");
    }
  };

  const handleOpenCompleteModal = (jobId: string) => {
      setSelectedJobId(jobId);
      setIsCompleteModalOpen(true);
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[#0B1120]"><Loader2 className="w-10 h-10 animate-spin text-orange-500"/></div>;
  if (!data) return null;

  return (
    <div className="p-6 md:p-10 font-sans text-slate-200 bg-[#0B1120] min-h-screen pb-20">
        
        {/* HEADER */}
        <header className="flex justify-between items-end mb-10 border-b border-slate-800 pb-8">
            <div>
                <h1 className="text-3xl font-black text-white mb-2 uppercase">Bonjour, {data.user.name}</h1>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-orange-500 text-orange-500 bg-orange-500/10">Artisan Certifié</Badge>
                    <button onClick={toggleAvailability} className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all ${data.user.isAvailable ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-slate-600 text-slate-400 bg-slate-800'}`}>
                        <div className={`w-2 h-2 rounded-full ${data.user.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        {data.user.isAvailable ? 'DISPONIBLE' : 'HORS LIGNE'}
                    </button>
                </div>
            </div>
             <div className="hidden md:block bg-slate-900 px-6 py-4 rounded-xl border border-slate-800 shadow-lg text-right">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Solde Portefeuille</p>
                <p className="text-3xl font-black text-emerald-400 tracking-tight">{formatCurrency(data.user.walletBalance)}</p>
            </div>
        </header>

        {/* LISTE DES MISSIONS */}
        <div className="space-y-4">
            {data.jobs.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-lg">Aucune intervention en cours.</p>
                </div>
            ) : (
                data.jobs.map(job => (
                    <Card key={job.id} className="bg-slate-900 border-slate-800 text-slate-200 shadow-xl hover:border-slate-700 transition">
                        <CardContent className="p-6 flex flex-col lg:flex-row gap-8">
                            
                            {/* INFO GAUCHE */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Badge className={`${job.status === 'IN_PROGRESS' ? 'bg-orange-600 hover:bg-orange-600' : job.status === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-600'} text-white border-none px-3 py-1`}>
                                        {job.status === 'IN_PROGRESS' ? 'EN COURS' : job.status === 'RESOLVED' ? 'TERMINÉ' : 'NOUVELLE DEMANDE'}
                                    </Badge>
                                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1 font-bold">
                                        <Clock className="w-3 h-3"/> {new Date(job.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div>
                                    {/* ✅ TITRE CLIQUABLE CORRECTEMENT PLACÉ ICI */}
                                    <Link href={`/dashboard/artisan/incidents/${job.id}`} className="hover:underline decoration-orange-500 underline-offset-4">
                                        <h3 className="text-2xl font-black text-white uppercase mb-2">{job.title}</h3>
                                    </Link>
                                    <p className="text-slate-400 text-sm leading-relaxed">{job.description}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <p className="text-slate-300 text-xs font-bold bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-orange-500"/> {job.address}
                                    </p>
                                    {job.status === 'IN_PROGRESS' && (
                                         <p className="text-slate-300 text-xs font-bold bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex items-center gap-2">
                                            <Phone className="w-3 h-3 text-blue-500"/> {job.reporterPhone || "Non renseigné"}
                                         </p>
                                    )}
                                </div>
                            </div>

                            {/* --- ACTIONS DROITE --- */}
                            <div className="flex flex-col justify-center gap-4 min-w-[240px] border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8">
                                <div className="text-right w-full mb-2">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-wider">Montant Estimé</p>
                                    <p className="text-2xl font-black text-white tracking-tight">
                                        {job.quoteAmount && job.quoteAmount > 0 ? formatCurrency(job.quoteAmount) : <span className="text-slate-600 text-lg">Sur devis</span>}
                                    </p>
                                </div>

                                {/* CAS 1: NOUVELLE DEMANDE */}
                                {job.status === 'OPEN' && (
                                    <div className="space-y-3 w-full">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button onClick={() => handleJobAction(job.id, 'ACCEPT')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 text-xs uppercase tracking-wider">
                                                <Play className="w-3 h-3 mr-2"/> Accepter
                                            </Button>
                                            <Button onClick={() => handleJobAction(job.id, 'REJECT')} variant="outline" className="border-red-900/50 text-red-500 hover:bg-red-900/10 h-10 text-xs uppercase tracking-wider">
                                                <XCircle className="w-3 h-3 mr-2"/> Refuser
                                            </Button>
                                        </div>
                                        {/* Bouton Devis pour Open */}
                                        <Link href={`/dashboard/artisan/incidents/${job.id}/quote`} className="w-full block">
                                            <Button variant="secondary" className="w-full text-xs font-bold uppercase bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 h-10">
                                                <DollarSign className="w-3 h-3 mr-2"/> Faire un devis
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                                
                                {/* CAS 2: EN COURS */}
                                {job.status === 'IN_PROGRESS' && (
                                    <div className="space-y-3 w-full">
                                        
                                        {/* BOUTON DEVIS VISIBLE MÊME EN COURS (Si pas de montant fixé) */}
                                        {(!job.quoteAmount || job.quoteAmount === 0) && (
                                            <Link href={`/dashboard/artisan/incidents/${job.id}/quote`} className="w-full block">
                                                <Button variant="secondary" className="w-full text-xs font-bold uppercase bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 h-10">
                                                    <DollarSign className="w-3 h-3 mr-2"/> Faire un devis
                                                </Button>
                                            </Link>
                                        )}

                                        <Button 
                                            onClick={() => handleOpenCompleteModal(job.id)} 
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black shadow-lg shadow-orange-900/20 py-6 text-sm uppercase tracking-wider"
                                        >
                                            <Camera className="w-5 h-5 mr-2" /> Clôturer le chantier
                                        </Button>
                                    </div>
                                )}

                                {job.status === 'RESOLVED' && (
                                    <div className="text-center p-3 bg-emerald-500/10 text-emerald-500 font-bold rounded-xl border border-emerald-500/20 flex flex-col items-center">
                                        <CheckCircle className="w-6 h-6 mb-1"/>
                                        <span className="text-xs uppercase tracking-widest">Validé & Payé</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>

        {selectedJobId && (
            <CompleteJobModal 
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                jobId={selectedJobId}
                onSuccess={() => {
                    setIsCompleteModalOpen(false);
                    fetchDashboard();
                }}
            />
        )}
    </div>
  );
}
