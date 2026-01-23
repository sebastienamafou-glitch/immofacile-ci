import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Users, Phone, Mail, ShieldCheck, MoreVertical } from "lucide-react";
import CreateAgentModal from "@/components/agency/CreateAgentModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Force le rendu dynamique pour voir les nouveaux agents instantanément
export const dynamic = 'force-dynamic';

export default async function AgencyTeamPage() {
  // 1. Auth & Context
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    redirect("/dashboard");
  }

  // 2. Data Fetching (Scoped to Agency)
  const agents = await prisma.user.findMany({
    where: {
      agencyId: admin.agency.id, // [cite: 13] Filtre Strict
      role: "AGENT"              // [cite: 60] Uniquement les agents
    },
    include: {
        _count: {
            select: { 
                missionsAccepted: true, // [cite: 10] KPI Performance
                leads: true             // KPI Commercial
            }
        }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
             <Users className="text-orange-500" /> Mon Équipe
          </h1>
          <p className="text-slate-400 mt-1">
            Gérez les accès et suivez les performances de vos agents.
          </p>
        </div>
        <CreateAgentModal />
      </div>

      {/* LISTE DES AGENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                <p className="text-slate-500">Aucun agent dans votre équipe pour le moment.</p>
                <p className="text-sm text-slate-600">Commencez par en ajouter un !</p>
            </div>
        ) : (
            agents.map((agent) => (
                <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group relative">
                    
                    {/* MENU ACTIONS (Placeholder) */}
                    <button className="absolute top-4 right-4 text-slate-600 hover:text-white">
                        <MoreVertical size={16} />
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <Avatar className="w-14 h-14 border-2 border-slate-800">
                            <AvatarImage src={agent.image || undefined} />
                            <AvatarFallback className="bg-slate-800 text-slate-400 font-bold text-lg">
                                {agent.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-white font-bold text-lg line-clamp-1">{agent.name}</h3>
                            <p className="text-orange-500 text-xs font-bold uppercase tracking-wider">
                                {agent.jobTitle || "Agent"}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950 p-2 rounded-lg">
                            <Mail size={14} />
                            <span className="truncate">{agent.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400 bg-slate-950 p-2 rounded-lg">
                            <Phone size={14} />
                            <span>{agent.phone || "Non renseigné"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white">{agent._count.missionsAccepted}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Missions</p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-2xl font-black text-blue-500">{agent._count.leads}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Prospects</p>
                        </div>
                    </div>

                    {agent.isVerified && (
                        <div className="absolute top-0 left-0 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded-br-lg border-r border-b border-emerald-500/20 flex items-center gap-1">
                            <ShieldCheck size={10} /> VÉRIFIÉ
                        </div>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}
