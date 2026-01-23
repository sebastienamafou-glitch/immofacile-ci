import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MissionCard from "@/components/agent/MissionCard"; // ✅ On importe le composant qu'on a créé à côté
import { Briefcase, MapPin, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Force le mode dynamique pour avoir les dernières données
export const dynamic = 'force-dynamic';

export default async function AgentMissionsPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const agent = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!agent || agent.role !== "AGENT") redirect("/dashboard");

  // 1. Récupérer les missions disponibles (Marketplace)
  const marketplaceMissions = await prisma.mission.findMany({
    where: { 
      status: "PENDING", 
      agentId: null 
    },
    include: { property: true }, // Important pour l'adresse
    orderBy: { createdAt: "desc" }
  });

  // 2. Récupérer mes missions acceptées (Planning)
  const myMissions = await prisma.mission.findMany({
    where: { 
      agentId: agent.id,
      status: { in: ["ACCEPTED", "COMPLETED"] } 
    },
    include: { property: true }, // Important pour l'adresse
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Gestion des Visites</h1>
          <p className="text-slate-400">Gérez votre planning et acceptez de nouvelles missions.</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-500/20 flex items-center gap-2">
            <Briefcase size={16} /> Mode Agent Activé
        </div>
      </div>

      <Tabs defaultValue="market" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1">
          <TabsTrigger value="market" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
             📍 Nouvelles Missions
          </TabsTrigger>
          <TabsTrigger value="planning" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
             📅 Mon Planning
          </TabsTrigger>
        </TabsList>

        {/* MARKETPLACE */}
        <TabsContent value="market" className="mt-6">
            {marketplaceMissions.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                    <MapPin className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                    <h3 className="text-white font-bold">Aucune mission disponible</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceMissions.map(mission => (
                        <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            userEmail={userEmail} 
                            isMarketplace={true} 
                        />
                    ))}
                </div>
            )}
        </TabsContent>

        {/* PLANNING */}
        <TabsContent value="planning" className="mt-6">
             {myMissions.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                    <CalendarDays className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                    <h3 className="text-white font-bold">Planning vide</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myMissions.map(mission => (
                        <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            userEmail={userEmail} 
                            isMarketplace={false} 
                        />
                    ))}
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
