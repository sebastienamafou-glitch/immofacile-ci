"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addArtisan } from "@/lib/api"; // Notre fonction API connectée
import { toast } from "sonner"; // Pour les notifications stylées
import { 
  Hammer, Wrench, Paintbrush, Key, HardHat, Phone, MapPin, 
  UserPlus, Loader2, Contact, CheckCircle2 
} from "lucide-react";

// Liste des métiers courants avec icônes
const JOB_TYPES = [
  { id: 'PLOMBIER', label: 'Plombier', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'ELECTRICIEN', label: 'Électricien', icon: ZapIcon, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }, // Voir note plus bas pour l'icône Zap
  { id: 'PEINTRE', label: 'Peintre', icon: Paintbrush, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { id: 'SERRURIER', label: 'Serrurier', icon: Key, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  { id: 'MACON', label: 'Maçon', icon: HardHat, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'AUTRE', label: 'Autre', icon: Hammer, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

// Petite astuce pour l'icône manquante si besoin
function ZapIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}

export default function AddArtisanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    job: "PLOMBIER",
    location: "Abidjan"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Appel API
      await addArtisan(formData);

      // 2. Notification Succès
      toast.success("Artisan ajouté au carnet !", {
        description: `${formData.name} est maintenant disponible pour vos interventions.`,
        icon: <CheckCircle2 className="text-emerald-500" />,
      });

      // 3. Reset ou Redirection
      setFormData({ name: "", phone: "", job: "PLOMBIER", location: "Abidjan" });
      router.refresh(); 

    } catch (error) {
      toast.error("Erreur", { description: "Impossible d'ajouter l'artisan." });
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = JOB_TYPES.find(j => j.id === formData.job) || JOB_TYPES[5];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase italic">
          <Contact className="text-orange-500 w-8 h-8" /> Carnet Artisans
        </h1>
        <p className="text-slate-500 text-sm font-bold mt-1">Constituez votre équipe de maintenance de confiance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl">
        
        {/* COLONNE GAUCHE : FORMULAIRE */}
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" /> Nouvel Intervenant
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nom Complet */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom de l'artisan</label>
              <input 
                required
                type="text" 
                placeholder="Ex: Kouassi Michel"
                className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition outline-none font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Téléphone & Ville */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Téléphone</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      required
                      type="tel" 
                      placeholder="07 07 ..."
                      className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Zone / Ville</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Cocody"
                      className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                </div>
              </div>
            </div>

            {/* Sélection du Métier (Grille Visuelle) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Spécialité</label>
              <div className="grid grid-cols-3 gap-3">
                {JOB_TYPES.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setFormData({...formData, job: job.id})}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      formData.job === job.id 
                        ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500' 
                        : 'bg-[#0B1120] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <job.icon className={`w-6 h-6 mb-2 ${formData.job === job.id ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold uppercase ${formData.job === job.id ? 'text-white' : 'text-slate-500'}`}>
                      {job.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 uppercase tracking-wide mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {loading ? "Enregistrement..." : "Ajouter au carnet"}
            </button>

          </form>
        </div>

        {/* COLONNE DROITE : APERÇU CARTE DE VISITE */}
        <div className="flex flex-col justify-center">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-[2rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-32 bg-orange-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Aperçu de la fiche</p>

                <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full ${selectedJob.bg} flex items-center justify-center mb-4 border-4 border-[#0B1120] shadow-2xl`}>
                        <selectedJob.icon className={`w-10 h-10 ${selectedJob.color}`} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white text-center">
                        {formData.name || "Nom de l'artisan"}
                    </h3>
                    
                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${selectedJob.bg} ${selectedJob.color}`}>
                        {selectedJob.label}
                    </span>

                    <div className="mt-8 w-full space-y-3">
                        <div className="bg-[#0B1120]/50 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                            <Phone className="text-slate-400 w-5 h-5" />
                            <p className="font-mono text-lg text-slate-300">{formData.phone || "---"}</p>
                        </div>
                        <div className="bg-[#0B1120]/50 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                            <MapPin className="text-slate-400 w-5 h-5" />
                            <p className="font-medium text-slate-300">{formData.location || "Abidjan"}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-slate-600 text-xs mt-6 px-10">
                Cet artisan sera disponible dans la liste lors du signalement d'un incident par un locataire.
            </p>
        </div>

      </div>
    </div>
  );
}
