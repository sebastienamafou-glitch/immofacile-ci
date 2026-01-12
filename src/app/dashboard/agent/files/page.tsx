"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  FileText, CheckCircle, XCircle, Eye, 
  Download, UserCheck, ShieldAlert, Loader2, Filter 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Interface alignée avec la réponse Prisma
interface Applicant {
  id: string;
  status: string;
  property: {
    title: string;
    address: string;
  };
  tenant: {
    name: string;
    email: string;
    phone: string;
    kycStatus: string;
    kycDocumentUrl?: string; // Peut être null
    income?: number;
    jobTitle?: string;
  };
  createdAt: string;
}

export default function AgentFilesPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Applicant[]>([]);
  
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // --- CHARGEMENT ---
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agent/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (error) {
      console.error("Erreur chargement dossiers", error);
      toast.error("Impossible de charger les dossiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // --- ACTIONS ---
  const handleInspect = (app: Applicant) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApp) return;
    setProcessing(true);
    try {
        await api.post('/agent/applications/review', {
            leaseId: selectedApp.id,
            decision: decision
        });
        toast.success(decision === 'APPROVED' ? "Dossier validé et Bail activé !" : "Dossier refusé.");
        setIsModalOpen(false);
        fetchApplications(); 
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de la décision.");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center bg-[#060B18]">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen bg-[#060B18] pb-20 font-sans text-slate-200">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Dossiers Locataires</h1>
            <p className="text-slate-400 mt-1">Vérifiez la solvabilité et les pièces d'identité.</p>
        </div>
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white bg-transparent">
            <Filter className="w-4 h-4 mr-2" /> Filtrer
        </Button>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                <FileText className="w-8 h-8 opacity-50"/>
            </div>
            <p className="text-slate-300 font-bold text-lg">Aucun dossier en attente</p>
            <p className="text-slate-500 text-sm mt-1">Tout est à jour !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
                <Card key={app.id} className="bg-slate-900 border-slate-800 hover:border-orange-500/50 transition-all group overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700">
                                    {app.tenant.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm truncate w-32">{app.tenant.name}</h4>
                                    <p className="text-xs text-slate-500">{app.tenant.jobTitle || "N/A"}</p>
                                </div>
                            </div>
                            <Badge className={`${getStatusColor(app.status)} text-[10px] border`}>
                                {app.status === 'PENDING' ? 'EN ATTENTE' : app.status}
                            </Badge>
                        </div>

                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 mb-4">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Candidat pour :</p>
                            <p className="text-xs font-medium text-white truncate">{app.property.title}</p>
                        </div>

                        <Button 
                            onClick={() => handleInspect(app)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-9"
                        >
                            <Eye className="w-3 h-3 mr-2" /> EXAMINER LE DOSSIER
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      {/* --- MODALE D'INSPECTION --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0f172a] border-slate-800 text-white max-w-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-orange-500"/> 
                    Analyse du Candidat
                </DialogTitle>
            </DialogHeader>
            
            {selectedApp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs text-slate-500 uppercase font-bold">Identité</p>
                            <p className="font-bold text-lg text-white">{selectedApp.tenant.name}</p>
                            <p className="text-sm text-slate-400">{selectedApp.tenant.email}</p>
                            <p className="text-sm text-slate-400">{selectedApp.tenant.phone}</p>
                        </div>
                        <div className="p-4 bg-emerald-900/10 rounded-xl border border-emerald-500/20">
                            <p className="text-xs text-emerald-500 mb-1 font-bold uppercase">Revenus Mensuels</p>
                            <p className="font-black text-emerald-400 text-2xl">
                                {selectedApp.tenant.income ? `${selectedApp.tenant.income.toLocaleString()} F` : "Non déclaré"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 h-64 relative group">
                        {selectedApp.tenant.kycDocumentUrl ? (
                            <>
                                <img 
                                    src={selectedApp.tenant.kycDocumentUrl} 
                                    alt="CNI" 
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-lg" 
                                />
                                <a 
                                    href={selectedApp.tenant.kycDocumentUrl} 
                                    target="_blank"
                                    className="absolute bottom-4 right-4 bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                                    title="Télécharger"
                                >
                                    <Download className="w-4 h-4"/>
                                </a>
                            </>
                        ) : (
                            <div className="text-center text-slate-500">
                                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                <p className="text-sm font-medium">Pièce d'identité manquante</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <DialogFooter className="gap-3 sm:gap-0 mt-4">
                <Button variant="ghost" onClick={() => handleDecision('REJECTED')} disabled={processing} className="text-red-500 hover:text-red-400 hover:bg-red-950/30">
                    <XCircle className="w-4 h-4 mr-2"/> Refuser le dossier
                </Button>
                <Button onClick={() => handleDecision('APPROVED')} disabled={processing} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6">
                    {processing ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                    ACCEPTER & CRÉER LE BAIL
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusColor(status: string) {
    switch(status) {
        case 'PENDING': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-slate-800 text-slate-400';
    }
}
