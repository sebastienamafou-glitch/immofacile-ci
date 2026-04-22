import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { 
  ArrowLeft, Wrench, MapPin, Phone, 
  User, CheckCircle2, XCircle, FileText, Calendar, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveQuoteAction, rejectQuoteAction } from "../actions";

export const dynamic = 'force-dynamic';

export default async function AgencyIncidentDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 1. RÉCUPÉRATION COMPLÈTE DU DOSSIER
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      property: true,
      reporter: { select: { name: true, phone: true } },
      assignedTo: { select: { name: true, phone: true, jobTitle: true, isVerified: true } },
      quote: { include: { items: true } }
    }
  });

  if (!incident || incident.property.agencyId !== session.user.agencyId) {
    return notFound();
  }

  const isQuotation = incident.status === "QUOTATION";
  const isResolved = incident.status === "RESOLVED";
  const isInProgress = incident.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-8 font-sans pb-20">
      
      {/* HEADER NAVIGATION */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/dashboard/agency/maintenance">
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4 pl-0 hover:bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour à la maintenance
            </Button>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={`
                        ${isQuotation ? 'border-orange-500 text-orange-500' : 
                          isResolved ? 'border-emerald-500 text-emerald-500' : 
                          isInProgress ? 'border-blue-500 text-blue-500' :
                          'border-slate-500 text-slate-500'}
                    `}>
                        {isQuotation ? 'DEVIS EN ATTENTE' : isResolved ? 'TERMINÉ' : isInProgress ? 'EN COURS' : 'NOUVEAU'}
                    </Badge>
                    <span className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest">
                        Réf: {incident.id.substring(0,8)}
                    </span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase">{incident.title}</h1>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : DÉTAILS DU CHANTIER */}
          <div className="lg:col-span-2 space-y-6">
              
              <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                          <Wrench className="text-orange-500 w-5 h-5"/> Signalement Initial
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <p className="text-slate-300 leading-relaxed text-sm">{incident.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1 bg-slate-800/50 p-4 rounded-xl">
                              <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2"><MapPin className="w-3 h-3"/> Bien concerné</p>
                              <p className="text-white text-sm font-medium">{incident.property.title}</p>
                              <p className="text-xs text-slate-400">{incident.property.address}</p>
                          </div>
                          <div className="flex flex-col gap-1 bg-slate-800/50 p-4 rounded-xl">
                              <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2"><Phone className="w-3 h-3"/> Contact sur place (Locataire)</p>
                              <p className="text-white text-sm font-medium">{incident.reporter.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{incident.reporter.phone || "Non renseigné"}</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {incident.photos && incident.photos.length > 0 && (
                  <Card className="bg-slate-900 border-slate-800">
                      <CardHeader>
                          <CardTitle className="text-white text-sm uppercase">Photos jointes</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {incident.photos.map((url: string, i: number) => (
                                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt={`Preuve ${i}`} className="w-full h-full object-cover hover:scale-105 transition duration-500"/>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              )}
          </div>

          {/* COLONNE DROITE : DEVIS ET ARTISAN */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* Carte Artisan */}
              {incident.assignedTo && (
                  <Card className="bg-[#0F172A] border-blue-900/50">
                      <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                                  <User className="text-blue-500 w-6 h-6"/>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Artisan Assigné</p>
                                  <p className="text-white font-bold">{incident.assignedTo.name}</p>
                                  <p className="text-xs text-blue-400">{incident.assignedTo.jobTitle || "Technicien"}</p>
                              </div>
                          </div>
                          {incident.assignedTo.isVerified && (
                              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                  <ShieldCheck className="w-4 h-4"/> Profil Certifié (KYC)
                              </div>
                          )}
                      </CardContent>
                  </Card>
              )}

              {/* Carte Devis */}
              {incident.quote ? (
                  <Card className="bg-[#0F172A] border-orange-500/30 shadow-2xl shadow-orange-900/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <FileText className="w-32 h-32" />
                      </div>
                      
                      <CardHeader className="border-b border-slate-800 pb-4">
                          <CardTitle className="text-white text-lg flex items-center justify-between">
                              Proposition Tarifaire
                              <span className="text-xs font-mono text-slate-500">{incident.quote.number}</span>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 relative z-10">
                          
                          <div className="space-y-3 mb-6">
                              {incident.quote.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-start text-sm">
                                      <div className="flex-1 pr-4">
                                          <p className="text-slate-300">{item.description}</p>
                                          <p className="text-[10px] text-slate-500">{item.quantity} x {item.unitPrice.toLocaleString()} F</p>
                                      </div>
                                      <div className="font-mono text-slate-300 font-bold">
                                          {item.total.toLocaleString()} F
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <div className="h-px bg-slate-800 my-4"></div>

                          <div className="flex justify-between items-end mb-6">
                              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Net</span>
                              <span className="text-3xl font-black text-emerald-400 tracking-tighter">
                                  {incident.quote.totalAmount.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
                              </span>
                          </div>

                          {/* 1. AFFICHAGE DES NOTES (Optionnel) */}
                          {incident.quote.notes && (
                              <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Note de l'artisan :</p>
                                  <p className="text-sm text-slate-300 italic">"{incident.quote.notes}"</p>
                              </div>
                          )}

                          {/* 2. BOUTONS D'ACTION (Liés au statut du devis, pas aux notes !) */}
                          {incident.quote.status === "PENDING" && (
                              <div className="space-y-3 mt-6">
                                  <form action={async (formData: FormData) => {
                                      "use server";
                                      await approveQuoteAction(incident.id, formData);
                                  }}>
                                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02]">
                                          <CheckCircle2 className="w-5 h-5 mr-2"/> Valider & Autoriser
                                      </Button>
                                  </form>

                                  <form action={async (formData: FormData) => {
                                      "use server";
                                      await rejectQuoteAction(incident.id, formData);
                                  }}>
                                      <Button type="submit" variant="outline" className="w-full border-red-900/50 text-red-500 hover:bg-red-900/20 hover:text-red-400 uppercase tracking-widest text-xs transition-all">
                                          <XCircle className="w-4 h-4 mr-2"/> Refuser le devis
                                      </Button>
                                  </form>
                              </div>
                          )}
                              
                          {isResolved && (
                              <div className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-4 text-center rounded-xl font-black uppercase text-sm flex justify-center items-center gap-2">
                                  <CheckCircle2 className="w-5 h-5"/> Intervention Payée
                              </div>
                          )}
                      </CardContent>
                  </Card>
              ) : (
                  <Card className="bg-slate-900 border-slate-800 border-dashed">
                      <CardContent className="p-8 text-center flex flex-col items-center justify-center">
                          <Calendar className="w-10 h-10 text-slate-600 mb-3" />
                          <p className="text-slate-400 font-medium text-sm">Aucun devis reçu pour le moment.</p>
                          <p className="text-xs text-slate-500 mt-1">L'artisan doit soumettre sa proposition via son application.</p>
                      </CardContent>
                  </Card>
              )}
          </div>
      </div>
    </div>
  );
}
