import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  Building, Users, Wallet, TrendingUp, BarChart3, 
  UserPlus, AlertTriangle, MapPin 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = 'force-dynamic';

export default async function AgencyDashboardPage() {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agency) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#020617] text-white gap-4">
        <AlertTriangle className="w-12 h-12 text-orange-500" />
        <h1 className="text-xl font-bold">Configuration incomplète</h1>
        <p className="text-slate-400">Votre compte n'est lié à aucune agence active.</p>
        <Button variant="outline" className="mt-4">Contacter le Support</Button>
      </div>
    );
  }

  const agencyId = admin.agency.id;

  // ✅ REQUÊTES OPTIMISÉES (Agrégations incluses)
  const [
    propertiesCount,
    listingsCount,
    agents,
    revenueData,
    // E. Répartition par Commune (Biens Physiques)
    propertiesByCommune,
    // F. Répartition par Ville (Listings Courte Durée)
    listingsByCity
  ] = await Promise.all([
    prisma.property.count({ where: { agencyId } }),
    prisma.listing.count({ where: { agencyId } }),
    prisma.user.findMany({
      where: { agencyId, role: "AGENT" },
      select: {
        id: true, name: true, image: true, 
        _count: { select: { missionsAccepted: true } }
      },
      orderBy: { missionsAccepted: { _count: 'desc' } },
      take: 5
    }),
    prisma.bookingPayment.aggregate({
      where: { booking: { listing: { agencyId } }, status: "SUCCESS" },
      _sum: { agencyCommission: true }
    }),
    // Agrégation Property
    prisma.property.groupBy({
      by: ['commune'],
      where: { agencyId },
      _count: { id: true },
    }),
    // Agrégation Listing
    prisma.listing.groupBy({
      by: ['city'],
      where: { agencyId },
      _count: { id: true },
    })
  ]);

  // ✅ LOGIQUE MÉTIER : Fusion des zones géographique
  const totalAssets = propertiesCount + listingsCount;
  const totalRevenue = revenueData._sum.agencyCommission || 0;
  
  // Calculs fictifs pour l'UI (à dynamiser avec l'historique plus tard)
  const growthRate = 12.5; 
  const occupancyRate = totalAssets > 0 ? Math.round((listingsCount / totalAssets) * 85) : 0; 

  // 1. Fusionner les données (Commune = City)
  const zoneMap = new Map<string, number>();

  // Ajouter les propriétés
  propertiesByCommune.forEach((item) => {
    const zone = item.commune.trim(); // Normalisation basique
    zoneMap.set(zone, (zoneMap.get(zone) || 0) + item._count.id);
  });

  // Ajouter les listings
  listingsByCity.forEach((item) => {
    const zone = item.city.trim(); 
    zoneMap.set(zone, (zoneMap.get(zone) || 0) + item._count.id);
  });

  // 2. Trier et prendre le Top 3
  const topZones = Array.from(zoneMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3 seulement

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-slate-200 pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-black text-white">Command Center</h1>
             <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20 uppercase tracking-wider">
                {admin.agency.name}
             </span>
          </div>
          <p className="text-slate-400">Pilotage de votre activité en temps réel.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 text-white bg-slate-900 hover:bg-slate-800">
            <UserPlus className="mr-2 h-4 w-4" /> Inviter un Agent
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold">
            <BarChart3 className="mr-2 h-4 w-4" /> Rapport PDF
          </Button>
        </div>
      </div>

      {/* KPI FINANCIERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        
        {/* CA MENSUEL */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
           <CardContent className="p-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Commissions (Mois)</p>
                    <h3 className="text-2xl lg:text-3xl font-black text-white mt-2">
                        {new Intl.NumberFormat('fr-FR').format(totalRevenue)} <span className="text-lg text-slate-500">F</span>
                    </h3>
                 </div>
                 <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                    <Wallet size={20} />
                 </div>
              </div>
              <div className={`mt-4 text-xs font-medium flex items-center ${growthRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 <TrendingUp size={14} className="mr-1.5"/> 
                 {growthRate > 0 ? '+' : ''}{growthRate}% <span className="text-slate-500 ml-1 font-normal">vs mois dernier</span>
              </div>
           </CardContent>
        </Card>

        {/* PARC ACTIF */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
           <CardContent className="p-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mandats Actifs</p>
                    <h3 className="text-3xl font-black text-white mt-2">{totalAssets}</h3>
                 </div>
                 <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 border border-blue-500/20">
                    <Building size={20} />
                 </div>
              </div>
              <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
                 <span className="text-white font-bold">{propertiesCount}</span> Longue durée
                 <span className="text-slate-600">|</span>
                 <span className="text-white font-bold">{listingsCount}</span> Courte durée
              </div>
           </CardContent>
        </Card>

        {/* TAUX OCCUPATION */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
           <CardContent className="p-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux Occupation</p>
                    <h3 className="text-3xl font-black text-white mt-2">{occupancyRate}%</h3>
                 </div>
                 <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
                    <Users size={20} />
                 </div>
              </div>
              <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-orange-500 h-full rounded-full" style={{ width: `${occupancyRate}%` }}></div>
              </div>
           </CardContent>
        </Card>

        {/* ÉQUIPE */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
           <CardContent className="p-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agents Terrain</p>
                    <h3 className="text-3xl font-black text-white mt-2">{agents.length}</h3>
                 </div>
                 <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20">
                    <Users size={20} />
                 </div>
              </div>
              <div className="mt-4 flex -space-x-2">
                 {agents.slice(0, 4).map((agent) => (
                    <Avatar key={agent.id} className="w-6 h-6 border-2 border-slate-900">
                        <AvatarImage src={agent.image || undefined} />
                        <AvatarFallback className="text-[8px] bg-slate-700">
                            {agent.name?.slice(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                 ))}
                 {agents.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white font-bold">
                        +{agents.length - 4}
                    </div>
                 )}
              </div>
           </CardContent>
        </Card>
      </div>

      {/* SECTION GESTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Top Agents */}
         <Card className="col-span-1 bg-slate-900 border-slate-800 overflow-hidden">
            <CardHeader className="bg-slate-950/50 border-b border-slate-800/50 py-4">
               <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                   🏆 Top Performance
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-800/50">
                  {agents.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">
                          Aucun agent actif.
                          <br/>
                          <Button variant="link" className="text-orange-500 p-0 h-auto mt-2">Inviter un membre</Button>
                      </div>
                  ) : (
                      agents.map((agent, index) => (
                         <div key={agent.id} className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition group">
                            <div className="flex items-center gap-3">
                               <div className={`
                                   w-6 h-6 flex items-center justify-center rounded-full text-xs font-black
                                   ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                     index === 1 ? 'bg-slate-400/20 text-slate-400' : 
                                     index === 2 ? 'bg-orange-700/20 text-orange-700' : 'text-slate-600'}
                               `}>
                                   #{index + 1}
                               </div>
                               <Avatar className="h-9 w-9 border border-slate-800">
                                  <AvatarImage src={agent.image || undefined} />
                                  <AvatarFallback className="bg-slate-800 text-slate-400 text-xs font-bold">
                                    {agent.name?.charAt(0)}
                                  </AvatarFallback>
                               </Avatar>
                               <div>
                                  <p className="text-white font-bold text-sm group-hover:text-orange-400 transition">{agent.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                    {agent._count.missionsAccepted} Missions
                                  </p>
                               </div>
                            </div>
                         </div>
                      ))
                  )}
               </div>
            </CardContent>
         </Card>

         {/* ✅ VRAIE Carte Géographique (Données réelles) */}
         <Card className="col-span-1 lg:col-span-2 bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader className="bg-slate-950/50 border-b border-slate-800/50 py-4 flex flex-row items-center justify-between">
               <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                   <MapPin className="text-orange-500 w-4 h-4" /> Couverture Agence
               </CardTitle>
               <div className="flex gap-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span> Dominant
                   </div>
                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></span> Présent
                   </div>
               </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-6">
                
                {topZones.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                        <p>Aucun bien localisé pour le moment.</p>
                        <p className="text-xs mt-1">Ajoutez des propriétés pour voir la répartition.</p>
                    </div>
                ) : (
                    topZones.map((zone, idx) => {
                        // Couleur dynamique selon le classement
                        let colorClass = "bg-blue-500";
                        let gradientClass = "from-blue-600 to-blue-400";
                        let textClass = "text-blue-400";

                        if (idx === 0) {
                            colorClass = "bg-emerald-500";
                            gradientClass = "from-emerald-600 to-emerald-400";
                            textClass = "text-emerald-400";
                        } else if (idx === 1) {
                            colorClass = "bg-orange-500";
                            gradientClass = "from-orange-600 to-orange-400";
                            textClass = "text-orange-400";
                        }

                        return (
                            <div key={zone.name} className="space-y-2">
                                <div className="flex justify-between text-sm text-slate-300 font-medium">
                                    <span className="capitalize">{zone.name}</span>
                                    <span className={textClass}>
                                        {zone.percentage}% <span className="text-slate-600 text-xs ml-1">({zone.count} biens)</span>
                                    </span>
                                </div>
                                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                    <div 
                                        className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-1000`} 
                                        style={{ width: `${zone.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })
                )}

            </CardContent>
         </Card>
      </div>
    </div>
  );
}
