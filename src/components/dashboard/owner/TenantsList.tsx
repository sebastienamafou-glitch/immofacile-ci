"use client";

import Link from "next/link";
import { Users, Plus, MessageCircle, FileText, ShieldCheck, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// ✅ IMPORT OFFICIEL
import { Property, Lease, User } from "@prisma/client";

// ✅ DÉFINITION ROBUSTE (Basée sur Prisma)
// On décrit exactement ce que l'API nous envoie (Propriété + Baux + Locataire)
type PropertyWithTenants = Property & {
    leases: (Lease & {
        tenant: User | null; // Le locataire peut être null si supprimé
    })[];
};

export default function TenantsList({ properties }: { properties: PropertyWithTenants[] }) {
  
  // Aplatissement sécurisé
  const activeTenants = properties?.flatMap(p => 
    (p.leases || [])
        // On filtre : bail actif ET locataire existant
        .filter(l => l.isActive && l.tenant)
        .map(l => ({
            id: l.tenant!.id, // Le '!' est sûr grâce au filter ci-dessus
            leaseId: l.id,   
            name: l.tenant!.name || "Locataire Inconnu",
            phone: l.tenant!.phone || "Non renseigné",
            property: p.title || "Bien sans nom",
            commune: p.commune || "",
            rent: l.monthlyRent || 0,
            startDate: l.startDate ? new Date(l.startDate).toLocaleDateString('fr-FR') : "N/A",
            isVerified: l.tenant!.kycStatus === 'VERIFIED',
        }))
  ) || [];

  return (
    <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-8 mt-8 shadow-xl relative overflow-hidden">
        
        {/* EN-TÊTE */}
        <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-500" /> Locataires Actifs
                </h3>
                <p className="text-slate-500 text-xs font-bold mt-1">
                    Suivi des dossiers et contacts
                </p>
            </div>
            
            <Link 
                href="/dashboard/owner/tenants/add" 
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2 transition shadow-lg shadow-purple-500/20 active:scale-95"
            >
                <Plus className="w-4 h-4" /> Nouveau Bail
            </Link>
        </div>

        {/* TABLEAU */}
        <div className="overflow-x-auto relative z-10">
            {activeTenants.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-white/5">
                        <tr>
                            <th className="py-4 pl-4">Locataire</th>
                            <th className="py-4">Bien Loué</th>
                            <th className="py-4 text-right">Loyer</th>
                            <th className="py-4 text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activeTenants.map((t, i) => (
                            <tr key={i} className="hover:bg-white/5 transition group">
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/10 bg-slate-800">
                                            <AvatarFallback className="text-xs font-bold text-slate-300 bg-slate-800">
                                                {(t.name || "LOC").substring(0,2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                                {t.name}
                                                {t.isVerified && (
                                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-mono tracking-tight">{t.phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <div className="flex flex-col">
                                        <span className="text-slate-300 font-medium text-xs">{t.property}</span>
                                        {t.commune && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" /> {t.commune}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 text-right">
                                    <span className="font-mono font-bold text-emerald-400 text-sm">
                                        {t.rent.toLocaleString('fr-FR')} <span className="text-[10px] text-emerald-500/50">FCFA</span>
                                    </span>
                                </td>
                                <td className="py-4 text-right pr-4">
                                    <div className="flex justify-end gap-2">
                                        <Link 
                                            href={`/dashboard/contract/${t.leaseId}`} 
                                            className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition border border-blue-500/20"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="py-16 text-center text-slate-500">
                    <p>Aucun locataire actif</p>
                </div>
            )}
        </div>
    </div>
  );
}
