import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, User, Phone, Navigation, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import MissionActionPanel from "@/components/agent/MissionActionPanel";
import Link from "next/link";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function MissionDetailPage({ params }: PageProps) {
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const agent = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!agent || agent.role !== "AGENT") redirect("/dashboard");

  // Récupération de la mission avec les infos Propriétaire (Owner)
  const mission = await prisma.mission.findUnique({
    where: { id: params.id },
    include: {
        property: {
            include: {
                owner: { select: { name: true, phone: true, email: true } } // On récupère le contact du proprio
            }
        }
    }
  });

  if (!mission) {
    return <div className="p-10 text-white">Mission introuvable.</div>;
  }

  // SÉCURITÉ : Est-ce bien MA mission ?
  if (mission.agentId !== agent.id) {
     return (
        <div className="p-10 flex flex-col items-center justify-center h-[50vh] text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Accès Refusé</h1>
            <p className="text-slate-400">Vous n'êtes pas assigné à cette mission.</p>
            <Link href="/dashboard/agent/mission">
                <Button variant="link" className="text-orange-500 mt-4">Retour aux missions</Button>
            </Link>
        </div>
     );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      
      {/* HEADER */}
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
            </div>
            <h1 className="text-2xl font-black text-white">{mission.type.replace(/_/g, " ")}</h1>
            <p className="text-slate-400 flex items-center gap-2 mt-1">
                <Calendar size={14} />
                {mission.dateScheduled ? (
                    <>Prévu le {format(new Date(mission.dateScheduled), "dd MMMM yyyy à HH:mm", { locale: fr })}</>
                ) : (
                     <span>Date à définir</span>
          )}
            </p>
        </div>
        
        <div className="text-right hidden md:block">
            <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Honoraires</p>
            <p className="text-2xl font-black text-emerald-500">{mission.fee.toLocaleString()} F</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLONNE GAUCHE : INFOS BIEN & PROPRIO */}
        <div className="md:col-span-2 space-y-6">
            
            {/* CARTE LOCALISATION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="h-40 bg-slate-800 relative flex items-center justify-center">
                    {/* Placeholder Map - À remplacer par Google Maps/Leaflet plus tard */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Abidjan_Map.png')] bg-cover bg-center"></div>
                    <MapPin className="text-orange-500 w-10 h-10 relative z-10 drop-shadow-lg" />
                </div>
                <div className="p-6">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                        <MapPin size={18} className="text-orange-500" /> Adresse d'intervention
                    </h3>
                    <p className="text-lg text-slate-200">{mission.property.address}</p>
                    <p className="text-slate-400">{mission.property.commune}</p>
                    
                    <div className="mt-6 flex gap-3">
                        <Button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white gap-2">
                            <Navigation size={16} /> Waze / GPS
                        </Button>
                    </div>
                </div>
            </div>

            {/* CONTACT PROPRIÉTAIRE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={14} /> Contact Sur place
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-bold text-lg">{mission.property.owner.name}</p>
                        <p className="text-slate-500 text-sm">Propriétaire</p>
                    </div>
                    <a href={`tel:${mission.property.owner.phone}`}>
                        <Button className="bg-green-600 hover:bg-green-500 text-white rounded-full w-12 h-12 p-0 shadow-lg shadow-green-900/20">
                            <Phone size={20} />
                        </Button>
                    </a>
                </div>
            </div>

        </div>

        {/* COLONNE DROITE : ACTION */}
        <div className="space-y-6">
            <MissionActionPanel missionId={mission.id} status={mission.status} />
            
            {/* RAPPEL HONORAIRES MOBILE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:hidden">
                <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Honoraires prévus</p>
                <p className="text-3xl font-black text-emerald-500">{mission.fee.toLocaleString()} F</p>
            </div>
        </div>

      </div>
    </div>
  );
}
