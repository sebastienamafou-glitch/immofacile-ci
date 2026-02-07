
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Settings, ShieldCheck, AlertTriangle } from "lucide-react";
import AgencySettingsForm from "@/components/agency/AgencySettingsForm";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgencySettingsPage() {
  // 1. SÉCURITÉ ZERO TRUST
  const session = await auth();

  // Si aucune session ou pas d'ID utilisateur, redirection immédiate vers le login
  if (!session || !session.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 2. RÉCUPÉRATION DONNÉES
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN") || !admin.agency) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mb-4 text-orange-500" />
            <h2 className="text-xl text-white font-bold">Accès Restreint</h2>
            <p>Seuls les administrateurs peuvent modifier les paramètres de l'agence.</p>
        </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Settings className="text-orange-500 w-8 h-8" /> Paramètres Agence
        </h1>
        <p className="text-slate-400">
            Configurez votre identité visuelle, vos coordonnées et vos informations légales.
        </p>
      </div>

      {/* ALERT STATUS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4 shadow-lg">
        <div className={`p-2 rounded-full mt-1 ${admin.agency.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"}`}>
            <ShieldCheck size={24} />
        </div>
        <div>
            <p className="text-sm font-bold text-white uppercase tracking-wide">
                Statut du compte : <span className={admin.agency.isActive ? "text-emerald-400" : "text-yellow-400"}>
                    {admin.agency.isActive ? "VÉRIFIÉ" : "EN ATTENTE"}
                </span>
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {admin.agency.isActive 
                    ? "Votre agence est pleinement opérationnelle. Vos annonces sont visibles sur la marketplace." 
                    : "Votre dossier est en cours de validation par l'équipe ImmoFacile. Certaines fonctionnalités sont restreintes."}
            </p>
        </div>
      </div>

      {/* FORMULAIRE */}
      <AgencySettingsForm initialData={admin.agency} />
    </div>
  );
}
