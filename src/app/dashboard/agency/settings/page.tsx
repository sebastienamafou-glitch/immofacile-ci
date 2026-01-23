import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Settings, ShieldCheck } from "lucide-react";
import AgencySettingsForm from "@/components/agency/AgencySettingsForm";

export const dynamic = 'force-dynamic';

export default async function AgencySettingsPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <Settings className="text-orange-500" /> Paramètres Agence
        </h1>
        <p className="text-slate-400">
            Configurez votre identité visuelle, vos coordonnées et vos informations légales.
        </p>
      </div>

      {/* ALERT STATUS */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex items-center gap-4">
        <div className={`p-2 rounded-full ${admin.agency.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"}`}>
            <ShieldCheck size={24} />
        </div>
        <div>
            <p className="text-sm font-bold text-white">Statut du compte : {admin.agency.isActive ? "VÉRIFIÉ" : "EN ATTENTE"}</p>
            <p className="text-xs text-slate-500">
                {admin.agency.isActive 
                    ? "Votre agence est pleinement opérationnelle et visible." 
                    : "Votre dossier est en cours de validation par l'équipe ImmoFacile."}
            </p>
        </div>
      </div>

      {/* FORMULAIRE */}
      <AgencySettingsForm initialData={admin.agency} />
    </div>
  );
}
