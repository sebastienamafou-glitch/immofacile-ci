"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowLeft, MapPin, Phone, Calendar, 
  Wrench, CheckCircle2, AlertCircle, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// ✅ IMPORT DU CHAT
import IncidentChat from "@/components/shared/IncidentChat";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Récupérer l'Incident
        const incidentRes = await api.get(`/artisan/incidents/${incidentId}`);
        if (incidentRes.data.success) {
            setIncident(incidentRes.data.incident);
        }

        // 2. Récupérer l'Utilisateur courant (pour le Chat)
        // On utilise l'endpoint profil qu'on a créé précédemment
        const userRes = await api.get('/artisan/profile'); 
        setCurrentUser(userRes.data);

      } catch (error) {
        console.error(error);
        toast.error("Erreur de chargement du dossier.");
        router.push('/dashboard/artisan');
      } finally {
        setLoading(false);
      }
    };

    if (incidentId) fetchData();
  }, [incidentId, router]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="w-10 h-10 animate-spin text-orange-500"/></div>;
  if (!incident || !currentUser) return null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-8 font-sans pb-20">
      
      {/* HEADER NAVIGATION */}
      <div className="max-w-7xl mx-auto mb-8">
        <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-white mb-4 pl-0 hover:bg-transparent"
        >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au tableau de bord
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={`
                        ${incident.status === 'IN_PROGRESS' ? 'border-orange-500 text-orange-500' : 
                          incident.status === 'RESOLVED' ? 'border-emerald-500 text-emerald-500' : 
                          'border-blue-500 text-blue-500'}
                    `}>
                        {incident.status === 'IN_PROGRESS' ? 'EN COURS' : incident.status === 'RESOLVED' ? 'TERMINÉ' : 'NOUVEAU'}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono">Dossier #{incident.id.substring(0,8)}</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase">{incident.title}</h1>
            </div>
            
            {/* Action Rapide (Devis si pas encore fait) */}
            {(!incident.quote && incident.status !== 'RESOLVED') && (
                 <Button onClick={() => router.push(`/dashboard/artisan/incidents/${incidentId}/quote`)} variant="secondary" className="font-bold">
                    Faire un devis
                 </Button>
            )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : DÉTAILS DU CHANTIER */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Carte Info Principale */}
              <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                          <Wrench className="text-orange-500 w-5 h-5"/> Détails techniques
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <p className="text-slate-300 leading-relaxed">{incident.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                              <MapPin className="text-slate-500 w-5 h-5"/>
                              <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Adresse</p>
                                  <p className="text-white text-sm font-medium">{incident.property?.address}, {incident.property?.commune}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                              <Phone className="text-slate-500 w-5 h-5"/>
                              <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Contact Sur Place</p>
                                  <p className="text-white text-sm font-medium">{incident.reporter?.phone || "Non renseigné"}</p>
                              </div>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {/* Photos Signalement (Si existantes) */}
              {incident.photos && incident.photos.length > 0 && (
                  <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                          <CardTitle className="text-white text-sm uppercase">Photos du signalement</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {incident.photos.map((url: string, i: number) => (
                                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                                      <img src={url} alt={`Preuve ${i}`} className="w-full h-full object-cover hover:scale-105 transition duration-500"/>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              )}
          </div>

          {/* COLONNE DROITE : CHAT */}
          <div className="lg:col-span-1">
              <div className="sticky top-6">
                  {/* ✅ INTÉGRATION DU CHAT */}
                  <IncidentChat 
                    incidentId={incident.id} 
                    currentUserId={currentUser.id} // ID récupéré depuis /api/artisan/profile
                  />
                  
                  <div className="mt-4 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-300">
                          Utilisez ce chat pour convenir des RDV. Toutes les conversations sont enregistrées pour votre sécurité.
                      </p>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}
