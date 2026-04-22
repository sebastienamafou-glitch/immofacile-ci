import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, DollarSign, Percent, Building2, User, ChevronLeft } from "lucide-react";
import MandateActionButtons from "./MandateActionButtons"; // Le composant client qu'on crée juste en dessous

export default async function AgencyMandatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch direct et ultra-rapide côté serveur
  const pendingMandates = await prisma.managementMandate.findMany({
    where: { 
      agencyId: session.user.id,
      status: "PENDING"
    },
    include: {
      property: true,
      owner: { select: { name: true, email: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
            <Building2 className="text-purple-500 w-8 h-8" /> 
            Opportunités de Gestion
          </h1>
          <p className="text-slate-400 mt-1">Propriétaires souhaitant vous déléguer leurs biens</p>
        </div>
      </div>

      {/* LISTE DES LEADS */}
      {pendingMandates.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aucune demande en attente</h3>
            <p className="text-slate-400">Vos futures opportunités de mandat apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingMandates.map((mandate) => (
            <div key={mandate.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col sm:flex-row">
              
              {/* Image de la propriété */}
              <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-slate-800 shrink-0">
                {mandate.property.images?.[0] ? (
                  <Image src={mandate.property.images[0]} alt="Propriété" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Building2 className="text-slate-600" /></div>
                )}
              </div>

              {/* Infos & Actions */}
              <div className="p-5 flex flex-col justify-between w-full">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white leading-tight line-clamp-1">{mandate.property.title}</h3>
                    <span className="bg-purple-500/10 text-purple-400 text-xs font-bold px-2 py-1 rounded-md border border-purple-500/20 whitespace-nowrap">
                      {mandate.commissionRate}% Com.
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-sm flex items-center mb-4">
                    <MapPin className="w-3.5 h-3.5 mr-1" /> {mandate.property.address}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Loyer estimé</p>
                        <p className="text-emerald-400 font-black text-sm flex items-center">
                            <DollarSign className="w-3.5 h-3.5 mr-0.5" /> {mandate.property.price.toLocaleString()} F
                        </p>
                    </div>
                    <div className="bg-slate-950 rounded-lg p-2 border border-slate-800">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-0.5">Propriétaire</p>
                        <p className="text-slate-300 font-bold text-sm flex items-center line-clamp-1">
                            <User className="w-3.5 h-3.5 mr-1" /> {mandate.owner.name || "Anonyme"}
                        </p>
                    </div>
                  </div>
                </div>

                {/* Composant Client pour les actions */}
                <MandateActionButtons mandateId={mandate.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
