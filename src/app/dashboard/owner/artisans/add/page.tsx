"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import { toast } from "sonner"; 
import { 
  Hammer, Wrench, Paintbrush, Key, HardHat, Phone, MapPin, 
  UserPlus, Loader2, Contact, CheckCircle2, Zap, Mail
} from "lucide-react";

// Liste des métiers courants avec icônes
const JOB_TYPES = [
  { id: 'PLOMBIER', label: 'Plombier', icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'ELECTRICIEN', label: 'Électricien', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { id: 'PEINTRE', label: 'Peintre', icon: Paintbrush, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { id: 'SERRURIER', label: 'Serrurier', icon: Key, color: 'text-gray-400', bg: 'bg-gray-400/10' },
  { id: 'MACON', label: 'Maçon', icon: HardHat, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'AUTRE', label: 'Autre', icon: Hammer, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

export default function AddArtisanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    job: "PLOMBIER",
    location: "Abidjan",
    email: "" 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ SÉCURITÉ ZERO TRUST : 
      // Plus de localStorage, plus de headers manuels.
      // Le cookie HttpOnly gère l'auth automatiquement.
      await api.post("/owner/artisans", formData);

      // Notification Succès
      toast.success("Artisan ajouté au carnet !", {
        description: `${formData.name} est maintenant disponible pour vos interventions.`,
        icon: <CheckCircle2 className="text-emerald-500" />,
      });

      // Reset et Redirection
      router.refresh(); 
      router.push("/dashboard/owner/artisans"); 

    } catch (error: any) {
      console.error(error);
      // Gestion intelligente des erreurs API (ex: doublon 409)
      const errorMsg = error.response?.data?.error || "Impossible d'ajouter l'artisan.";
      
      if (error.response?.status === 401) {
          router.push('/login');
      } else {
          toast.error("Erreur", { description: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = JOB_TYPES.find(j => j.id === formData.job) || JOB_TYPES[5];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 uppercase italic tracking-tight">
          <Contact className="text-orange-500 w-8 h-8" /> Carnet Artisans
        </h1>
        <p className="text-slate-500 text-sm font-bold mt-1">Constituez votre équipe de maintenance de confiance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl">
        
        {/* COLONNE GAUCHE : FORMULAIRE */}
        <div className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] shadow-xl h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-500" /> Nouvel Intervenant
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Nom Complet */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom de l'artisan <span className="text-red-500">*</span></label>
              <input 
                required
                type="text" 
                placeholder="Ex: Kouassi Michel"
                className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition outline-none font-medium placeholder:text-slate-700"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Téléphone & Ville */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Téléphone <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      required
                      type="tel" 
                      placeholder="07 07 ..."
                      className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none font-medium placeholder:text-slate-700"
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
                      className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none font-medium placeholder:text-slate-700"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                </div>
              </div>
            </div>

            {/* Email (Nouveau champ ajouté) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email (Optionnel)</label>
              <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    placeholder="contact@artisan.com"
                    className="w-full bg-[#0B1120] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none font-medium placeholder:text-slate-700"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
              </div>
            </div>

            {/* Sélection du Métier (Grille Visuelle) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Spécialité <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {JOB_TYPES.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setFormData({...formData, job: job.id})}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 ${
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
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 uppercase tracking-wide mt-6 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {loading ? "Enregistrement..." : "Ajouter au carnet"}
            </button>

          </form>
        </div>

        {/* COLONNE DROITE : APERÇU CARTE DE VISITE */}
        <div className="flex flex-col justify-center sticky top-10">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 rounded-[2rem] relative overflow-hidden group shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-32 bg-orange-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Aperçu de la fiche</p>

                <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full ${selectedJob.bg} flex items-center justify-center mb-4 border-4 border-[#0B1120] shadow-2xl transition-colors duration-300`}>
                        <selectedJob.icon className={`w-10 h-10 ${selectedJob.color}`} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white text-center break-all">
                        {formData.name || "Nom de l'artisan"}
                    </h3>
                    
                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-colors duration-300 ${selectedJob.bg} ${selectedJob.color}`}>
                        {selectedJob.label}
                    </span>

                    <div className="mt-8 w-full space-y-3">
                        <div className="bg-[#0B1120]/50 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                            <Phone className="text-slate-400 w-5 h-5 shrink-0" />
                            <p className="font-mono text-lg text-slate-300">{formData.phone || "---"}</p>
                        </div>
                        <div className="bg-[#0B1120]/50 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                            <MapPin className="text-slate-400 w-5 h-5 shrink-0" />
                            <p className="font-medium text-slate-300 truncate">{formData.location || "Abidjan"}</p>
                        </div>
                        {formData.email && (
                             <div className="bg-[#0B1120]/50 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                                <Mail className="text-slate-400 w-5 h-5 shrink-0" />
                                <p className="font-medium text-slate-300 text-sm truncate">{formData.email}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <p className="text-center text-slate-600 text-xs mt-6 px-10 leading-relaxed">
                Cet artisan sera disponible dans la liste lors du signalement d'un incident par un locataire.
            </p>
        </div>

      </div>
    </div>
  );
}
