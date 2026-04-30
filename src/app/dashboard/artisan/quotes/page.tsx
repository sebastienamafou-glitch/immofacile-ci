import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  FileText, CheckCircle2, XCircle, Clock, 
  ArrowRight, MapPin, Hammer, Wallet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuoteStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- DICTIONNAIRE DE STYLE POUR LES STATUTS ---
const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: any }> = {
  PENDING: { 
    label: "En attente", 
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20", 
    icon: Clock 
  },
  ACCEPTED: { 
    label: "Validé (Attente Fonds)", 
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20", 
    icon: FileText 
  },
  PAID: { 
    label: "Payé / À Réaliser", 
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", 
    icon: CheckCircle2 
  },
  REJECTED: { 
    label: "Refusé", 
    color: "bg-red-500/10 text-red-500 border-red-500/20", 
    icon: XCircle 
  }
};

export default async function ArtisanQuotesHistoryPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) redirect("/login");

  // 1. RÉCUPÉRATION DE L'HISTORIQUE DES DEVIS
  const quotes = await prisma.quote.findMany({
    where: { artisanId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      incident: {
        select: {
          id: true,
          title: true,
          status: true,
          property: {
            select: {
              title: true,
              address: true,
              commune: true
            }
          }
        }
      }
    }
  });

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500" />
            Mes Devis & Factures
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Suivi en temps réel de vos propositions et paiements
          </p>
        </div>
      </div>

      {/* Liste des Devis */}
      <div className="grid grid-cols-1 gap-4">
        {quotes.length > 0 ? (
          quotes.map((quote) => {
            const config = STATUS_CONFIG[quote.status];
            const StatusIcon = config.icon;

            return (
              <div 
                key={quote.id} 
                className="group bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 transition-all hover:bg-slate-900 hover:border-slate-700"
              >
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                  
                  {/* Info Incident & Bien */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${config.color} border font-bold uppercase text-[10px] px-3 py-1 rounded-full`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-slate-600 text-[10px] font-mono">#{quote.number}</span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">
                        {quote.incident.title}
                      </h2>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        {quote.incident.property.commune}, {quote.incident.property.address}
                      </div>
                    </div>
                  </div>

                  {/* Montant & Date */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-4 border-t lg:border-t-0 border-slate-800 pt-4 lg:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Montant Total</p>
                      <p className="text-xl font-black text-white">
                        {quote.totalAmount.toLocaleString('fr-FR')} <span className="text-xs font-medium text-slate-500">FCFA</span>
                      </p>
                    </div>
                    
                    <Link 
                      href={`/dashboard/artisan/incidents/${quote.incidentId}`}
                      className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
                    >
                      Détails <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hammer className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-white font-bold text-lg">Aucun devis émis</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
              Vous n'avez pas encore soumis de devis pour les incidents qui vous ont été assignés.
            </p>
          </div>
        )}
      </div>

      {/* Widget Info Paiement */}
      <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-500/20 rounded-[2.5rem] p-8 mt-12">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Wallet className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg uppercase tracking-tight">Sécurité des Paiements</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Sur Babimmo, vos interventions sont garanties. 
              Le statut <span className="text-blue-400 font-bold">Validé</span> signifie que le client est invité à régler le devis. 
              Une fois le statut <span className="text-emerald-400 font-bold">Payé</span> affiché, vous pouvez intervenir en toute sérénité : 
              les fonds ont été encaissés de manière sécurisée et sont <strong>consignés</strong> jusqu'à la clôture de l'incident.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
