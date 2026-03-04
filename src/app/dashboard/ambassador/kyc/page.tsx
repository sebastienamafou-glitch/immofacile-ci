import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import KycForm from "./KycForm";
import { ShieldAlert, ShieldCheck, Clock } from "lucide-react";
import BackButton from "@/components/shared/BackButton"; // ✅ L'import DRY

export const dynamic = 'force-dynamic';

export default async function KycPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { kyc: true }
  });

  if (!user || user.role !== "AMBASSADOR") redirect("/login");

  // Affichage selon le statut KYC
  if (user.kyc?.status === "PENDING") {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <BackButton /> {/* ✅ Retour dispo même en attente */}
        <div className="text-center mt-10">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">Dossier en cours d'analyse</h1>
          <p className="text-slate-500 font-medium">Votre pièce d'identité est en cours de vérification par notre équipe. Cette étape prend généralement moins de 24h.</p>
        </div>
      </div>
    );
  }

  if (user.kyc?.status === "VERIFIED") {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <BackButton /> {/* ✅ Retour dispo une fois validé */}
        <div className="text-center mt-10">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">Profil Certifié !</h1>
          <p className="text-slate-500 font-medium">Félicitations, vous êtes un partenaire certifié Babimmo. Vos annonces bénéficient désormais d'une visibilité maximale.</p>
        </div>
      </div>
    );
  }

  // Si pas de KYC ou rejeté, on affiche le formulaire
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <BackButton /> {/* ✅ Intégré au-dessus du titre principal */}
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mt-2">
          <ShieldAlert className="text-orange-500 w-8 h-8" />
          Certification Profil
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Fournissez une pièce d'identité valide pour certifier votre compte et rassurer vos locataires.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
         <KycForm />
      </div>
    </div>
  );
}
