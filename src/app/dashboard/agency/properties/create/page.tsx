
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreatePropertyForm from "@/components/agency/CreatePropertyForm";
import { UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function CreatePropertyPage() {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
const session = await auth();

// Si aucune session ou pas d'ID utilisateur, redirection immédiate vers le login
if (!session || !session.user?.id) {
  redirect("/login");
}

const userId = session.user.id;

  // 2. VÉRIFICATION RÔLE
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    redirect("/dashboard");
  }

  // 3. CHARGEMENT DES PROPRIÉTAIRES (CLIENTS)
  // Stratégie Hybride : On prend les Owners liés à l'agence + les Owners "orphelins" (pour faciliter l'onboarding)
  // Dans un système strict, on ne prendrait que { agencyId: admin.agencyId }
  const owners = await prisma.user.findMany({
    where: { 
        role: "OWNER",
        // Optionnel : agencyId: admin.agencyId (Pour restreindre aux clients de l'agence)
    },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen bg-[#020617] text-slate-200">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
                Nouveau Mandat <ShieldCheck className="text-emerald-500 w-6 h-6"/>
            </h1>
            <p className="text-slate-400 mt-1">Intégrez un nouveau bien sous gestion agence.</p>
        </div>
        
        {owners.length === 0 && (
            <Link href="/dashboard/agency/team"> 
                <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white gap-2">
                    <UserPlus size={16} /> Créer un Propriétaire
                </Button>
            </Link>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* Injection du formulaire Client Component */}
          <CreatePropertyForm owners={owners} />
      </div>
      
    </div>
  );
}
