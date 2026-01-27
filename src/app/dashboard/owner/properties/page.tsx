"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import { toast } from "sonner";
import { Loader2, Plus, Building2, Briefcase, MapPin, X, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// On suppose que ce composant existe déjà chez vous
import PropertiesGrid from "@/components/dashboard/owner/PropertiesGrid"; 
// SSOT : Import depuis Prisma
import { Property } from "@prisma/client";

// Typage étendu pour le Frontend
type PropertyWithStats = Property & {
    activeLeaseCount: number;
    totalRentGenerated: number;
    isAvailable: boolean; // Ajouté par l'API
};

export default function OwnerPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyWithStats[]>([]);

  // États pour la délégation (Mission)
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithStats | null>(null);
  const [creatingMission, setCreatingMission] = useState(false);
  
  const [missionData, setMissionData] = useState({
    type: 'VISITE',
    dateScheduled: '',
    fee: 5000 
  });

  // 1. CHARGEMENT DES BIENS
  const fetchProperties = async () => {
    try {
      // ✅ APPEL SÉCURISÉ : Plus besoin de headers manuels
      const res = await api.get('/owner/properties'); 
      
      if (res.data.success) {
          setProperties(res.data.properties);
      } else {
          throw new Error(res.data.error);
      }
    } catch (error: any) {
      console.error("Erreur chargement biens", error);
      // Redirection si session expirée (géré par axios interceptor normalement, mais ceinture et bretelles)
      if (error.response?.status === 401 || error.response?.status === 403) {
          router.push('/login');
      } else {
          toast.error("Impossible de charger vos biens.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // 2. GESTION DÉLÉGATION
  const handleOpenDelegate = (property: Property) => {
    // Cast sécurisé car on sait que l'API renvoie le type étendu
    const richProperty = property as PropertyWithStats;
    
    setSelectedProperty(richProperty);
    
    // Date par défaut : Demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMissionData({ ...missionData, dateScheduled: tomorrow.toISOString().split('T')[0] });
    
    setIsDelegateModalOpen(true);
  };

  const handleSubmitMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setCreatingMission(true);

    try {
        // ✅ APPEL SÉCURISÉ
        await api.post('/missions', {
            propertyId: selectedProperty.id,
            type: missionData.type,
            dateScheduled: missionData.dateScheduled,
            fee: missionData.fee,
        });

        toast.success("Mission publiée ! 🚀");
        setIsDelegateModalOpen(false);
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de la délégation.");
    } finally {
        setCreatingMission(false);
    }
  };

  // 3. RENDER
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#F59E0B]" />
        <p className="text-sm font-mono text-slate-500">Synchronisation du patrimoine...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 min-h-screen bg-[#0B1120] text-slate-100">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
                <Building2 className="w-8 h-8 text-[#F59E0B]" />
                Mes Biens
            </h1>
            <p className="text-slate-400 text-sm mt-1">
                {properties.length} {properties.length > 1 ? 'propriétés gérées' : 'propriété gérée'}.
            </p>
        </div>
        
        <Link 
            href="/dashboard/owner/properties/add"
            className="bg-[#F59E0B] text-[#0B1120] hover:bg-yellow-400 px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-yellow-500/10 active:scale-95"
        >
            <Plus className="w-5 h-5" />
            Ajouter un bien
        </Link>
      </div>

      {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Votre portefeuille est vide</h3>
              <p className="text-slate-500 max-w-md text-center mb-6">
                  Commencez par ajouter votre premier bien immobilier pour activer les fonctionnalités de gestion locative.
              </p>
              <Link 
                  href="/dashboard/owner/properties/add"
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition border border-slate-700"
              >
                  Ajouter mon premier bien
              </Link>
          </div>
      ) : (
          /* GRILLE DES BIENS */
          <PropertiesGrid 
            properties={properties} 
            onDelegate={handleOpenDelegate} 
          />
      )}

      {/* MODAL DE MISSION (Délégation) */}
      {isDelegateModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative">
                
                <div className="bg-slate-900 p-6 border-b border-slate-800 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            ⚡ Mission Flash
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">
                            Trouvez un agent certifié en moins de 5 min.
                        </p>
                    </div>
                    <button onClick={() => setIsDelegateModalOpen(false)} className="text-slate-400 hover:text-white transition bg-slate-800 p-1 rounded-full">
                        <X className="w-5 h-5"/>
                    </button>
                </div>

                <form onSubmit={handleSubmitMission} className="p-6 space-y-5">
                    
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
                            <Briefcase className="w-5 h-5 text-slate-300"/>
                        </div>
                        <div>
                            <p className="font-bold text-white text-sm truncate max-w-[200px]">{selectedProperty.title}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-500"/> {selectedProperty.commune}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300 text-xs uppercase font-bold">Type de mission</Label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none"
                            value={missionData.type}
                            onChange={(e) => setMissionData({...missionData, type: e.target.value})}
                        >
                            <option value="VISITE">🔑 Faire visiter le bien</option>
                            <option value="ETAT_DES_LIEUX_ENTREE">📥 État des Lieux (Entrée)</option>
                            <option value="ETAT_DES_LIEUX_SORTIE">📤 État des Lieux (Sortie)</option>
                            <option value="PHOTOS">📸 Shooting Photo Pro</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs uppercase font-bold">Date souhaitée</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none"/>
                                <Input 
                                    type="date" 
                                    className="pl-10 bg-slate-950 border-slate-700 text-white h-11"
                                    required
                                    value={missionData.dateScheduled}
                                    onChange={(e) => setMissionData({...missionData, dateScheduled: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300 text-xs uppercase font-bold">Votre Offre (F)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-emerald-500 pointer-events-none"/>
                                <Input 
                                    type="number" 
                                    className="pl-9 bg-slate-950 border-slate-700 text-white font-bold h-11 text-emerald-400"
                                    required
                                    min="2000"
                                    step="500"
                                    value={missionData.fee}
                                    onChange={(e) => setMissionData({...missionData, fee: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={creatingMission}
                        className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-black font-bold h-12 text-base shadow-lg shadow-yellow-500/20 rounded-xl transition-all active:scale-95"
                    >
                        {creatingMission ? <Loader2 className="animate-spin mr-2"/> : "Lancer la recherche"}
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
