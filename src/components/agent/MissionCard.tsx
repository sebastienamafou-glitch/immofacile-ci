"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Coins, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ✅ Définition stricte basée sur votre Schema Prisma
interface MissionProps {
  mission: {
    id: string;
    type: string; // Enum MissionType
    status: string; // Enum MissionStatus
    fee: number;
    dateScheduled: Date | string | null; //  Peut être null
    property: {
      address: string;
      commune: string; //  Property utilise 'commune', pas 'city'
    };
  };
  userEmail: string;
  isMarketplace?: boolean;
}

export default function MissionCard({ mission, userEmail, isMarketplace = false }: MissionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 🛡️ SÉCURITÉ : Empêche le crash "mission is undefined"
  if (!mission || !mission.property) return null;

  // Gestion sécurisée de la date (qui peut être null)
  const scheduledDate = mission.dateScheduled ? new Date(mission.dateScheduled) : null;
  const isValidDate = scheduledDate && !isNaN(scheduledDate.getTime());

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/missions/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: mission.id, userEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Mission acceptée ! 🚀");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition group h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-wider text-[10px]">
            {mission.type ? mission.type.replace(/_/g, " ") : "MISSION"}
          </Badge>
          <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg text-sm">
            <Coins size={14} />
            {mission.fee.toLocaleString()} F
          </div>
        </div>

        <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2 truncate">
            {/* ✅ Correction: commune au lieu de city */}
            <MapPin className="text-orange-500 w-4 h-4 flex-shrink-0" /> {mission.property.commune}
        </h3>
        <p className="text-slate-500 text-sm mb-4 truncate">{mission.property.address}</p>

        <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-950 p-3 rounded-xl border border-white/5">
            <Calendar size={16} />
            {isValidDate 
                ? format(scheduledDate!, "dd MMMM à HH:mm", { locale: fr }) 
                : <span className="text-slate-600 italic">Date à définir</span>
            }
        </div>
      </div>

      <div className="mt-6">
        {isMarketplace ? (
            <Button 
                onClick={handleAccept} 
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Accepter la mission"}
            </Button>
        ) : (
            <Link href={`/dashboard/agent/mission/${mission.id}`} className="w-full block">
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 group-hover:border-slate-500 transition">
                    Gérer la mission <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </Link>
        )}
      </div>
    </div>
  );
}
