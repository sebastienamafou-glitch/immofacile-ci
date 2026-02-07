
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Building2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AgencyPropertyCard from "@/components/agency/AgencyPropertyCard";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function AgencyPropertiesPage() {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
const session = await auth();

// Si aucune session ou pas d'ID utilisateur, redirection immédiate vers le login
if (!session || !session.user?.id) {
  redirect("/login");
}

const userId = session.user.id;

  // 2. VÉRIFICATION ADMIN AGENCE
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400">
            <AlertCircle className="w-10 h-10 mb-4 text-orange-500" />
            <h2 className="text-xl text-white font-bold">Accès Restreint</h2>
            <p>Espace réservé aux administrateurs d'agence.</p>
        </div>
    );
  }

  // 3. REQUÊTE SÉCURISÉE (Scope Agence)
  const properties = await prisma.property.findMany({
    where: {
      agencyId: admin.agencyId // 🔒 SÉCURITÉ : Uniquement les biens de l'agence
    },
    include: {
        owner: {
            select: { name: true }
        },
        leases: {
            where: { isActive: true } // Pour déterminer le statut
        },
        _count: {
            select: { incidents: true }
        }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#020617] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
             <Building2 className="text-orange-500 w-8 h-8" /> Biens Sous Gestion
          </h1>
          <p className="text-slate-400 mt-1 font-medium">
            Parc Immobilier de <span className="text-orange-400">{admin.agency?.name}</span> ({properties.length} mandats)
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <Link href="/dashboard/agency/properties/create">
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2 shadow-lg shadow-orange-900/20 transition-transform active:scale-95">
                    <Plus size={18} /> Nouveau Mandat
                </Button>
            </Link>
        </div>
      </div>

      {/* LISTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {properties.length === 0 ? (
            <div className="col-span-full py-24 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Aucun mandat actif</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Votre agence ne gère aucun bien pour le moment. Ajoutez votre premier mandat pour activer le tableau de bord.</p>
                <Link href="/dashboard/agency/properties/create">
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">Créer un mandat</Button>
                </Link>
            </div>
        ) : (
            properties.map((property) => (
                <AgencyPropertyCard key={property.id} property={property} />
            ))
        )}
      </div>
    </div>
  );
}
