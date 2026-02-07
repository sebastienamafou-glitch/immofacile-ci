import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, User, Phone, Navigation, ShieldAlert } from "lucide-react"; // Ajout ShieldAlert
import { Button } from "@/components/ui/button";
import MissionActionPanel from "@/components/agent/MissionActionPanel";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function MissionDetailPage({ params }: PageProps) {
  // 1. SÉCURITÉ ZERO TRUST (Auth v5)
  const session = await auth();
  if (!session || !session.user?.id) redirect("/login");

  const userId = session.user.id;
  const userRole = session.user.role; // ✅ Récupéré directement de la session

  // 2. RÉCUPÉRATION MISSION (Data fetching précoce)
  const mission = await prisma.mission.findUnique({
    where: { id: params.id },
    include: {
        property: {
            include: {
                owner: { select: { name: true, phone: true, email: true } } 
            }
        }
    }
  });

  if (!mission) {
    return <div className="p-10 text-white bg-[#0B1120] min-h-screen">Mission introuvable.</div>;
  }

  // 3. SÉCURITÉ : VÉRIFICATION D'ACCÈS (Standardisé)
  // On autorise si : C'est l'agent assigné OU si c'est le Super Admin
  const isAssignedAgent = mission.agentId === userId;
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  if (!isAssignedAgent && !isSuperAdmin) {
     return (
        <div className="p-10 flex flex-col items-center justify-center min-h-screen text-center bg-[#0B1120]">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Accès Restreint</h1>
            <p className="text-slate-400">Cette mission est réservée à l'agent assigné ou à l'administration.</p>
            <Link href="/dashboard">
                <Button variant="outline" className="text-white border-slate-700 mt-4">Retour au QG</Button>
            </Link>
        </div>
     );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24 bg-[#0B1120] min-h-screen">
      
      {/* HEADER AVEC BADGE ADMIN SI BESOIN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono">
                    #{mission.id.slice(-6).toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                    ${mission.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}
                `}>
                    {mission.status === 'COMPLETED' ? 'Terminée' : 'En Cours'}
                </span>
                {isSuperAdmin && (
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-black uppercase border border-amber-500/20">
                        Mode Super Admin
                    </span>
                )}
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                {mission.type.replace(/_/g, " ")}
            </h1>
            <p className="text-slate-400 flex items-center gap-2 mt-1 text-sm">
                <Calendar size={14} className="text-orange-500" />
                {mission.dateScheduled ? (
                    <>Prévu le {format(new Date(mission.dateScheduled), "dd MMMM yyyy à HH:mm", { locale: fr })}</>
                ) : (
                     <span className="italic">Date en attente de planification</span>
                )}
            </p>
        </div>
        
        <div className="text-right hidden md:block">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Commission Agent</p>
            <p className="text-2xl font-black text-emerald-500">{mission.fee.toLocaleString()} F</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE : INFOS */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="h-40 bg-slate-800 relative flex items-center justify-center bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Abidjan_Map.png')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/60"></div>
                    <MapPin className="text-orange-500 w-12 h-12 relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                </div>
                <div className="p-6">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                        <Navigation size={18} className="text-orange-500" /> Destination
                    </h3>
                    <p className="text-xl text-slate-100 font-bold">{mission.property.address}</p>
                    <p className="text-slate-400 text-sm">{mission.property.commune}, Abidjan</p>
                    
                    <div className="mt-8 flex gap-3">
                        <Button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-xl">
                            Ouvrir dans Maps
                        </Button>
                    </div>
                </div>
            </div>

            {/* CONTACT CLIENT */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={12} className="text-orange-500" /> Contact Client
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-black text-lg">{mission.property.owner.name}</p>
                        <p className="text-slate-500 text-xs">Propriétaire / Contact sur place</p>
                    </div>
                    {mission.property.owner.phone && (
                        <a href={`tel:${mission.property.owner.phone}`}>
                            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl w-14 h-14 p-0 shadow-lg shadow-emerald-900/40 transition-transform active:scale-95">
                                <Phone size={24} />
                            </Button>
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : PANEL D'ACTION */}
        <div className="space-y-6">
            {/* Si c'est le Super Admin, on peut afficher un message ou limiter les actions */}
            <MissionActionPanel missionId={mission.id} status={mission.status} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:hidden">
                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Honoraires</p>
                <p className="text-3xl font-black text-emerald-500">{mission.fee.toLocaleString()} F</p>
            </div>
        </div>

      </div>
    </div>
  );
}
