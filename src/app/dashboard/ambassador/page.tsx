import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShieldAlert, Users, Home, ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function AmbassadorDashboard() {
  const session = await auth();
  
  // 1. VÉRIFICATION DE LA SESSION
  if (!session?.user?.id) redirect("/login");

  // 2. VÉRIFICATION DU RÔLE (Le Videur Instantané)
  // On utilise le rôle stocké dans la session pour aller très vite.
  // Si le rôle n'y est pas, on vérifie manuellement, mais AVANT de charger les lourdes data.
  const userRole = session.user.role; 
  if (userRole && userRole !== "AMBASSADOR" && userRole !== "SUPER_ADMIN") {
      redirect("/dashboard");
  }

  // 3. SEULEMENT MAINTENANT, ON CHARGE LES DONNÉES (Car l'utilisateur est légitime)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      kyc: true,
      _count: {
        select: { propertiesOwned: true, leads: true }
      },
      propertiesOwned: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, price: true, isPublished: true, views: true } 
      }
    }
  });

  // Sécurité supplémentaire au cas où l'utilisateur n'existe plus en base
  if (!user) redirect("/login");
  
  

  const isKycVerified = user.kyc?.status === "VERIFIED";
  const kycPending = user.kyc?.status === "PENDING";

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 text-slate-900 font-sans">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            Bienvenue, {user.name?.split(' ')[0] || 'Partenaire'} 👋
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Votre espace d'acquisition et de gestion locative.</p>
      </div>

      {/* BANNIÈRE GROWTH HACK (INCITATION AU KYC) */}
      {!isKycVerified && (
        <div className="mb-8 bg-gradient-to-r from-slate-900 to-[#0B1120] rounded-3xl p-6 md:p-8 shadow-xl border border-orange-500/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="flex items-start gap-4 relative z-10">
                <div className="bg-orange-500/20 p-3 rounded-2xl border border-orange-500/50">
                    <ShieldAlert className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white mb-2">Débloquez votre plein potentiel</h2>
                    <p className="text-slate-300 max-w-2xl leading-relaxed font-medium">
                        Passez en statut <strong className="text-orange-400">Certifié Babimmo</strong> pour retirer le bandeau d'alerte sur vos annonces, rassurer vos futurs locataires et recevoir vos prospects directement sur WhatsApp.
                    </p>
                </div>
            </div>
            
            <div className="w-full md:w-auto relative z-10">
                <Link href="/dashboard/ambassador/kyc">
                    <button className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 text-[#0B1120] font-black px-8 py-4 rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                        {kycPending ? "Vérification en cours..." : "Certifier mon profil"} <ArrowRight className="w-5 h-5" />
                    </button>
                </Link>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* KPI 1 : PROSPECTS (Copywriting adapté) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 transition hover:shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-8 h-8" />
            </div>
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Prospects générés via vos partages</p>
                <div className="flex items-end gap-3">
                    <p className="text-4xl font-black text-slate-900">{user._count.leads}</p>
                    {user._count.leads > 0 && (
                        <span className="flex items-center text-xs font-bold text-emerald-500 mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <TrendingUp className="w-3 h-3 mr-1"/> Actif
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* KPI 2 : ANNONCES REVENDIQUÉES */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6 transition hover:shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Home className="w-8 h-8" />
            </div>
            <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Annonces revendiquées</p>
                <p className="text-4xl font-black text-slate-900">{user._count.propertiesOwned}</p>
            </div>
        </div>
      </div>

      {/* LISTE DES BIENS REVENDIQUÉS */}
      <h3 className="font-black text-xl mb-6 text-slate-900 flex items-center gap-2">
         Vos annonces en ligne
      </h3>
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {user.propertiesOwned.length === 0 ? (
             <div className="p-10 text-center text-slate-500">
                <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Vous n'avez pas encore revendiqué d'annonces.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {user.propertiesOwned.map((property) => (
                    <div key={property.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{property.title}</h4>
                            <p className="text-slate-500 font-medium">{property.price.toLocaleString()} FCFA / mois</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {isKycVerified ? (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none shadow-sm"><ShieldCheck className="w-3 h-3 mr-1"/> Certifié</Badge>
                            ) : (
                                <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-50 border border-orange-200 shadow-sm"><ShieldAlert className="w-3 h-3 mr-1"/> Partenaire</Badge>
                            )}
                            <Link href={`/properties/${property.id}`}>
                                <button className="text-sm font-bold text-blue-600 hover:text-blue-500 transition bg-blue-50 px-4 py-2 rounded-lg">Voir l'annonce</button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
}
