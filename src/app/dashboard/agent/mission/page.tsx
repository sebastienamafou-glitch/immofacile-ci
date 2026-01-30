import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MissionCard from "@/components/agent/MissionCard"; 
import { Briefcase, MapPin, CalendarDays } from "lucide-react"; // ShieldAlert retiré si inutilisé
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function AgentMissionsPage() {
  // 1. SÉCURITÉ ZERO TRUST
  const headersList = headers();
  const userId = headersList.get("x-user-id");
  
  if (!userId) redirect("/login");

  // 2. VÉRIFICATION RÔLE
  // On ne sélectionne que ce qui est utile (id, role)
  const agent = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!agent || agent.role !== "AGENT") redirect("/dashboard");

  // 3. DATA FETCHING OPTIMISÉ
  const [marketplaceMissions, myMissions] = await prisma.$transaction([
    // A. Marketplace (Missions sans agent assigné)
    prisma.mission.findMany({
        where: { status: "PENDING", agentId: null },
        include: { property: true },
        orderBy: { createdAt: "desc" }
    }),
    // B. Planning Perso
    prisma.mission.findMany({
        where: { 
            agentId: userId,
            status: { in: ["ACCEPTED", "COMPLETED"] } 
        },
        include: { property: true },
        orderBy: { dateScheduled: "desc" }
    })
  ]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen bg-[#0B1120] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Missions & Visites</h1>
          <p className="text-slate-400">Gérez votre planning et acceptez de nouvelles opportunités.</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-500/20 flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            <Briefcase size={18} /> Mode Agent Activé
        </div>
      </div>

      <Tabs defaultValue="market" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-full md:w-auto grid grid-cols-2 md:inline-flex">
          <TabsTrigger value="market" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg font-bold py-2.5 transition-all">
             📍 Marketplace
          </TabsTrigger>
          <TabsTrigger value="planning" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg font-bold py-2.5 transition-all">
             📅 Mon Planning
          </TabsTrigger>
        </TabsList>

        {/* MARKETPLACE */}
        <TabsContent value="market" className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {marketplaceMissions.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <MapPin className="mx-auto h-16 w-16 text-slate-700 mb-4" />
                    <h3 className="text-white font-bold text-lg mb-1">Aucune mission disponible</h3>
                    <p className="text-slate-500 text-sm">Revenez plus tard pour de nouvelles opportunités.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceMissions.map(mission => (
                        <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            // ❌ userEmail RETIRÉ (Correction Type Error)
                            isMarketplace={true} 
                        />
                    ))}
                </div>
            )}
        </TabsContent>

        {/* PLANNING */}
        <TabsContent value="planning" className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {myMissions.length === 0 ? (
                <div className="text-center py-24 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <CalendarDays className="mx-auto h-16 w-16 text-slate-700 mb-4" />
                    <h3 className="text-white font-bold text-lg mb-1">Planning vide</h3>
                    <p className="text-slate-500 text-sm">Acceptez une mission depuis l'onglet Marketplace pour commencer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myMissions.map(mission => (
                        <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            // ❌ userEmail RETIRÉ
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
