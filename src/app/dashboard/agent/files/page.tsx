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

interface Applicant {
  id: string; // ID du Bail (Lease)
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
    kycDocumentUrl?: string;
    income?: number;
    jobTitle?: string;
  };
  createdAt: string;
}

export default function AgentFilesPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Applicant[]>([]);
  
  // État pour la Modale de Vérification
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Charger les dossiers
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agent/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (error) {
      console.error("Erreur chargement dossiers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Ouvrir la modale
  const handleInspect = (app: Applicant) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  // Action : Valider ou Refuser
  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApp) return;
    setProcessing(true);
    try {
        await api.post('/agent/applications/review', {
            leaseId: selectedApp.id,
            decision: decision,
            comment: decision === 'APPROVED' ? "Dossier complet et validé." : "Pièces manquantes ou invalides."
        });
        toast.success(decision === 'APPROVED' ? "Dossier validé !" : "Dossier refusé.");
        setIsModalOpen(false);
        fetchApplications(); // Rafraîchir la liste
    } catch (error: any) {
        toast.error("Erreur lors de la décision.");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen pb-20">
      
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Dossiers Locataires</h1>
            <p className="text-slate-400 mt-1">Vérifiez la solvabilité et les pièces d'identité des candidats.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="border-slate-700 text-slate-300 gap-2">
                <Filter className="w-4 h-4" /> Filtrer
            </Button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4"/>
            <p className="text-slate-400 font-bold">Aucun dossier en attente</p>
            <p className="text-slate-600 text-sm">Tout est à jour ! Bon travail.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app) => (
                <Card key={app.id} className="bg-slate-900 border-slate-800 hover:border-orange-500/50 transition-all group">
                    <CardContent className="p-6">
                        {/* Header Carte */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700">
                                    {app.tenant.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{app.tenant.name}</h4>
                                    <p className="text-xs text-slate-500">{app.tenant.jobTitle || "Profession inconnue"}</p>
                                </div>
                            </div>
                            <Badge className={`${getStatusColor(app.status)} text-[10px]`}>
                                {app.status}
                            </Badge>
                        </div>

                        {/* Info Bien */}
                        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 mb-4">
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Candidat pour :</p>
                            <p className="text-xs font-medium text-white truncate">{app.property.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{app.property.address}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button 
                                onClick={() => handleInspect(app)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                            >
                                <Eye className="w-3 h-3 mr-2" /> INSPECTER
                            </Button>
                        </div>
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
                    Vérification du Dossier
                </DialogTitle>
            </DialogHeader>
            
            {selectedApp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Colonne Gauche : Infos */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm text-slate-400">Locataire</p>
                            <p className="font-bold text-lg">{selectedApp.tenant.name}</p>
                            <p className="text-sm text-slate-500">{selectedApp.tenant.phone}</p>
                            <p className="text-sm text-slate-500">{selectedApp.tenant.email}</p>
                        </div>
                        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                            <p className="text-xs text-slate-400 mb-1">Revenus Déclarés</p>
                            <p className="font-bold text-emerald-400 text-xl">
                                {selectedApp.tenant.income?.toLocaleString() || "Non renseigné"} F
                            </p>
                        </div>
                    </div>

                    {/* Colonne Droite : Pièce d'identité */}
                    <div className="bg-black/40 rounded-xl border border-slate-800 flex items-center justify-center p-2 h-64 relative">
                        {selectedApp.tenant.kycDocumentUrl ? (
                            <img 
                                src={selectedApp.tenant.kycDocumentUrl} 
                                alt="CNI" 
                                className="max-h-full max-w-full object-contain rounded-lg" 
                            />
                        ) : (
                            <div className="text-center text-slate-500">
                                <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                                <p className="text-xs">Aucun document téléchargé</p>
                            </div>
                        )}
                        {selectedApp.tenant.kycDocumentUrl && (
                            <a href={selectedApp.tenant.kycDocumentUrl} target="_blank" className="absolute bottom-2 right-2 bg-slate-900 p-2 rounded-full hover:bg-slate-700 transition">
                                <Download className="w-4 h-4 text-white"/>
                            </a>
                        )}
                    </div>
                </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => handleDecision('REJECTED')} disabled={processing} className="border-red-900 text-red-500 hover:bg-red-950 hover:text-red-400">
                    <XCircle className="w-4 h-4 mr-2"/> REFUSER
                </Button>
                <Button onClick={() => handleDecision('APPROVED')} disabled={processing} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                    {processing ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                    VALIDER LE DOSSIER
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Helper pour les couleurs de badge
function getStatusColor(status: string) {
    switch(status) {
        case 'PENDING': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-slate-800 text-slate-400';
    }
}
