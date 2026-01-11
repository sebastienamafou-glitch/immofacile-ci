"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Home, XCircle, ArrowLeft, Star } from "lucide-react";
import { createWhatsAppLink } from "@/lib/whatsapp";

export default function RehousingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // API V5: GET /leases/[id]/rehousing-check
    const fetchCheck = async () => {
        // Simulation des données (À remplacer par API réelle)
        setTimeout(() => {
            setData({
                tenant: { name: "M. Kouamé Michel", phone: "0707000000" },
                property: { title: "Villa Duplex Cocody" },
                isGoodTenant: true, // Calculé par le backend (0 retard, caution rendue)
                vacantProperties: [
                    { id: "p2", title: "Appartement Riviera 3", price: 350000, commune: "Cocody" },
                    { id: "p3", title: "Studio Zone 4", price: 200000, commune: "Marcory" }
                ]
            });
            setLoading(false);
        }, 800);
    };
    if(id) fetchCheck();
  }, [id]);

  if (loading) return <div className="h-screen bg-[#0B1120] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="h-screen bg-[#0B1120] flex items-center justify-center text-white">Erreur chargement.</div>;

  const { tenant, property, isGoodTenant, vacantProperties } = data;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 flex flex-col items-center justify-center font-sans">
      
      <div className="max-w-2xl w-full">
        
        {/* EN-TÊTE SUCCÈS */}
        <div className="text-center mb-10 animate-in slide-in-from-top-4">
            <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4 ring-1 ring-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-black text-white">Bail Clôturé avec succès</h1>
            <p className="text-slate-400 mt-2">Le logement <strong>{property.title}</strong> est désormais libre.</p>
        </div>

        {/* ANALYSE PROFIL */}
        <Card className={`bg-slate-900 border mb-8 relative overflow-hidden shadow-2xl ${isGoodTenant ? 'border-green-500/50' : 'border-red-500/50'}`}>
            <CardContent className="p-6">
                {isGoodTenant ? (
                    <>
                        <div className="absolute top-0 right-0 bg-green-500 text-[#0B1120] text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                            PROFIL OR <Star className="w-3 h-3 fill-current" />
                        </div>
                        <h2 className="text-xl font-bold text-green-400 mb-2">Locataire Certifié "Excellent Payeur"</h2>
                        <p className="text-sm text-slate-300">
                            <strong>{tenant.name}</strong> a quitté le logement sans incident ni retard. 
                            C'est un profil rare (Top 10%) à conserver absolument dans votre écosystème.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">RISQUE</div>
                        <h2 className="text-xl font-bold text-red-400 mb-2">Sortie avec incidents</h2>
                        <p className="text-sm text-slate-300">
                            Des retenues sur caution ou des retards ont été enregistrés. 
                            Il est déconseillé de proposer un relogement immédiat.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>

        {/* OFFRES DE RELOGEMENT (CROSS-SELLING) */}
        {isGoodTenant && vacantProperties.length > 0 && (
            <div className="animate-in fade-in zoom-in duration-500 delay-200">
                <h3 className="text-lg font-bold text-[#F59E0B] mb-4 flex items-center gap-2">
                    💎 ACTIVER LE PASS RELOGEMENT
                    <Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-800 font-normal">Data-Monetization</Badge>
                </h3>
                
                <p className="text-slate-400 text-sm mb-6">
                    Ne laissez pas partir ce bon payeur ! Proposez-lui immédiatement un de vos biens vacants sans frais d'agence :
                </p>

                <div className="space-y-4">
                    {vacantProperties.map((prop: any) => {
                        // Message WhatsApp pré-rédigé (Le Hack ultime)
                        const waMessage = `Bonjour ${tenant.name}, merci pour votre sérieux.\n\nSuite à votre départ, j'ai le plaisir de vous offrir le *Pass Relogement ImmoFacile*.\n\nJ'ai un autre bien disponible tout de suite : *${prop.title} à ${prop.commune}* (+${prop.price.toLocaleString('fr-FR')} FCFA).\n\nComme je connais votre dossier, *aucuns frais d'agence supplémentaires* si vous le prenez.\nIntéressé par une visite ?`;
                        const waLink = createWhatsAppLink(tenant.phone, waMessage);

                        return (
                            <div key={prop.id} className="bg-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-700 hover:border-[#F59E0B] transition group cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                                        <Home className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white group-hover:text-[#F59E0B] transition">{prop.title}</h4>
                                        <p className="text-xs text-slate-400">{prop.commune} • <span className="text-emerald-400 font-bold">{prop.price.toLocaleString()} FCFA</span></p>
                                    </div>
                                </div>

                                <Button 
                                    className="w-full md:w-auto bg-[#25D366] hover:bg-[#1da851] text-white font-bold gap-2 shadow-lg shadow-green-900/20"
                                    asChild
                                >
                                    <a href={waLink} target="_blank">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4" alt="WA"/>
                                        Proposer ce bien
                                    </a>
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {isGoodTenant && vacantProperties.length === 0 && (
            <div className="text-center p-8 border border-dashed border-slate-700 rounded-2xl bg-slate-800/50">
                <p className="text-slate-400">Ce locataire est excellent, mais vous n'avez aucun bien vacant à lui proposer pour le moment.</p>
            </div>
        )}

        <div className="mt-10 text-center">
            <Button variant="link" onClick={() => router.push('/dashboard')} className="text-slate-500 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour au Tableau de bord
            </Button>
        </div>

      </div>
    </div>
  );
}
