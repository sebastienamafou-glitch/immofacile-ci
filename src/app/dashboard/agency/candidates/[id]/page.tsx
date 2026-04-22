import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, UserCheck, MapPin, Mail, Phone, 
    FileText, CheckCircle2, XCircle, Clock, Eye, AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateApplicationStatusAction } from "../actions";
import GenerateLeaseForm from "./GenerateLeaseForm";

export const dynamic = 'force-dynamic';

export default async function AgencyCandidateDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      property: true,
      applicant: {
          // 🔒 CORRECTION : Ajout explicite de l'ID
          select: { id: true, name: true, email: true, phone: true, jobTitle: true } 
      }
    }
  });

  if (!application || application.property.agencyId !== session.user.agencyId) {
    return notFound();
  }

  const isPending = application.status === 'PENDING';
  const isReviewing = application.status === 'REVIEWING';
  const isAccepted = application.status === 'ACCEPTED';
  const isRejected = application.status === 'REJECTED';

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto">
      
      {/* HEADER & RETOUR */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/agency/candidates">
            <Button variant="ghost" className="text-slate-400 hover:text-white pl-0 hover:bg-transparent w-fit">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux dossiers
            </Button>
        </Link>
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-white tracking-tight">Analyse du dossier</h1>
            {isPending && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20"><Clock className="w-4 h-4 mr-1.5"/> Nouveau</Badge>}
            {isReviewing && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20"><Eye className="w-4 h-4 mr-1.5"/> En cours</Badge>}
            {isAccepted && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-4 h-4 mr-1.5"/> Accepté</Badge>}
            {isRejected && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-4 h-4 mr-1.5"/> Refusé</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : INFOS */}
          <div className="md:col-span-2 space-y-6">
              
              {/* Carte Locataire */}
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-orange-500" /> Profil du Candidat
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Nom complet</p>
                          <p className="text-white font-medium">{application.applicant.name}</p>
                      </div>
                      <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Profession</p>
                          <p className="text-white font-medium">{application.applicant.jobTitle || "Non renseigné"}</p>
                      </div>
                      <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Email</p>
                          <p className="text-white font-medium flex items-center gap-2"><Mail className="w-3 h-3 text-slate-400"/> {application.applicant.email}</p>
                      </div>
                      <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Téléphone</p>
                          <p className="text-white font-medium flex items-center gap-2"><Phone className="w-3 h-3 text-slate-400"/> {application.applicant.phone || "Non renseigné"}</p>
                      </div>
                  </div>
              </div>

              {/* Message du candidat */}
              {application.message && (
                  <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Message du candidat</p>
                      <p className="text-slate-300 italic text-sm leading-relaxed p-4 bg-black/20 rounded-xl border border-white/5">
                          "{application.message}"
                      </p>
                  </div>
              )}

              {/* Pièces jointes (Simulation) */}
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-500" /> Pièces justificatives
                  </h3>
                  {application.documents.length > 0 ? (
                      <div className="flex flex-col gap-3">
                          {application.documents.map((doc, idx) => (
                              <a key={idx} href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition group">
                                  <FileText className="w-5 h-5 text-slate-400 group-hover:text-orange-500" />
                                  <span className="text-sm font-medium text-slate-200">Document {idx + 1}</span>
                              </a>
                          ))}
                      </div>
                  ) : (
                      <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-sm">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          Aucun document n'a été fourni directement avec cette candidature. Veuillez consulter le profil KYC du client.
                      </div>
                  )}
              </div>
          </div>

          {/* COLONNE DROITE : BIEN & ACTIONS */}
          <div className="space-y-6">
              
              {/* Carte du Bien */}
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Bien ciblé</p>
                  <h4 className="font-bold text-white mb-1 leading-tight">{application.property.title}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-4"><MapPin className="w-3 h-3"/> {application.property.commune}</p>
                  
                  <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Loyer mensuel</span>
                      <span className="font-black text-emerald-400">{application.property.price.toLocaleString()} F</span>
                  </div>
              </div>

              {/* ACTIONS */}
              <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-xl sticky top-6">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Décision de l'agence</p>
                  
                  <div className="flex flex-col gap-3">
                      {(isPending || isReviewing) && (
                          <>
                              <form action={async () => { "use server"; await updateApplicationStatusAction(application.id, 'ACCEPTED'); }}>
                                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12">
                                      <CheckCircle2 className="w-5 h-5 mr-2" /> Accepter le dossier
                                  </Button>
                              </form>
                              
                              <form action={async () => { "use server"; await updateApplicationStatusAction(application.id, 'REJECTED'); }}>
                                  <Button type="submit" variant="outline" className="w-full border-red-900/50 text-red-500 hover:bg-red-900/20 h-12">
                                      <XCircle className="w-5 h-5 mr-2" /> Refuser
                                  </Button>
                              </form>
                          </>
                      )}

                      {isPending && (
                          <form action={async () => { "use server"; await updateApplicationStatusAction(application.id, 'REVIEWING'); }}>
                              <Button type="submit" variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700 h-10 mt-2 text-xs">
                                  <Eye className="w-4 h-4 mr-2" /> Marquer en cours d'analyse
                              </Button>
                          </form>
                      )}

                      {isAccepted && (
                          <div className="space-y-4">
                              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-bold rounded-xl text-center flex items-center justify-center gap-2">
                                  <CheckCircle2 className="w-5 h-5" /> Dossier validé
                              </div>
                              
                              <div className="pt-4 border-t border-white/10">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">
                                      Configuration du Bail
                                  </p>
                                  
                                  {/* Appel de notre composant client qui gère l'API */}
                                  <GenerateLeaseForm 
                                      propertyId={application.property.id} 
                                      tenantId={application.applicant.id} 
                                      rent={application.property.price} 
                                  />
                              </div>
                          </div>
                      )}

                      {isRejected && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-xl text-center flex flex-col gap-2">
                              <XCircle className="w-6 h-6 mx-auto" />
                              Dossier refusé.
                          </div>
                      )}
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
}
