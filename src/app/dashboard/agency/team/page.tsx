import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Phone, Mail, ShieldCheck, MoreVertical, AlertTriangle } from "lucide-react";
import CreateAgentModal from "@/components/agency/CreateAgentModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default async function AgencyTeamPage() {
  // 1. SÉCURITÉ ZERO TRUST
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  
  if (!userId) redirect("/login");

  // 2. VÉRIFICATION RÔLE
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mb-4 text-orange-500" />
            <h2 className="text-xl text-white font-bold">Accès Restreint</h2>
            <p>Espace réservé aux administrateurs d'agence.</p>
        </div>
    );
  }

  // 3. CHARGEMENT DES AGENTS (Scope Agence)
  const agents = await prisma.user.findMany({
    where: {
      agencyId: admin.agencyId, // 🔒 FILTRE STRICT
      role: "AGENT"
    },
    include: {
        _count: {
            select: { 
                missionsAccepted: true, 
                leads: true             
            }
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
             <Users className="text-orange-500 w-8 h-8" /> Mon Équipe
          </h1>
          <p className="text-slate-400 mt-1 font-medium">
            Gérez les accès et suivez les performances de vos {agents.length} agents.
          </p>
        </div>
        <CreateAgentModal />
      </div>

      {/* LISTE DES AGENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {agents.length === 0 ? (
            <div className="col-span-full py-24 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Équipe vide</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">Aucun agent dans votre équipe pour le moment. Invitez votre premier collaborateur !</p>
            </div>
        ) : (
            agents.map((agent) => (
                <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/30 transition group relative shadow-lg">
                    
                    {/* MENU ACTIONS (Placeholder pour future feature) */}
                    <button className="absolute top-4 right-4 text-slate-600 hover:text-white transition">
                        <MoreVertical size={16} />
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <Avatar className="w-14 h-14 border-2 border-slate-800 group-hover:border-slate-600 transition">
                            <AvatarImage src={agent.image || undefined} />
                            <AvatarFallback className="bg-slate-800 text-slate-400 font-bold text-lg">
                                {agent.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-white font-bold text-lg line-clamp-1">{agent.name}</h3>
                            <p className="text-orange-500 text-xs font-bold uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded w-fit mt-1">
                                {agent.jobTitle || "Agent Immobilier"}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
                            <Mail size={14} className="text-slate-500"/>
                            <span className="truncate">{agent.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/50">
                            <Phone size={14} className="text-slate-500"/>
                            <span>{agent.phone || "Non renseigné"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white group-hover:text-emerald-400 transition">{agent._count.missionsAccepted}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Missions</p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-2xl font-black text-white group-hover:text-blue-400 transition">{agent._count.leads}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Prospects</p>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
