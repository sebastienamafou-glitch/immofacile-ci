"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ArrowLeft, Home, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ReportIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);
  
  // États du formulaire
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // 1. Charger les propriétés au montage
  useEffect(() => {
    const fetchProperties = async () => {
        const stored = localStorage.getItem("immouser");
        if (!stored) { router.push('/login'); return; }
        const user = JSON.parse(stored);

        try {
            // On réutilise intelligemment votre API existante !
            const res = await api.get('/owner/tenant-form-data', {
                headers: { 'x-user-email': user.email }
            });
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (e) {
            toast.error("Impossible de charger vos biens.");
        } finally {
            setLoadingProps(false);
        }
    };
    fetchProperties();
  }, []);

  // 2. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    if (!selectedProperty) {
        toast.error("Veuillez sélectionner une propriété.");
        return;
    }

    setLoading(true);
    
    // On utilise JSON pour simplifier (si vous n'avez pas de bucket S3 configuré pour les photos)
    // Pour la photo, on envoie juste le nom pour l'instant ou on gérera l'upload séparément
    const payload = {
        title,
        description,
        propertyId: selectedProperty,
        // photo: photo ? photo.name : null // À activer si vous avez l'upload
    };

    try {
      await api.post("/owner/incidents", payload, {
          headers: { 'x-user-email': user.email }
      });
      
      toast.success("Incident signalé avec succès !");
      router.push("/dashboard/owner/maintenance");
    } catch (err) {
      toast.error("Erreur lors de l'envoi du signalement.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProps) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500"/></div>;

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white">
      
      <div className="mb-8">
        <Link href="/dashboard/owner/maintenance" className="flex items-center text-slate-400 hover:text-white gap-2 transition w-fit mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight">Signaler un problème</h1>
        <p className="text-slate-400 text-sm">Créez un ticket pour le suivi des travaux.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        
        {/* SÉLECTEUR DE PROPRIÉTÉ */}
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Propriété concernée</label>
            <div className="relative">
                <Home className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <select 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl appearance-none focus:border-orange-500 outline-none transition"
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    required
                >
                    <option value="">-- Choisir un bien --</option>
                    {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.commune})</option>
                    ))}
                </select>
            </div>
        </div>

        {/* TITRE */}
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Titre de l'incident</label>
            <input 
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-orange-500 outline-none transition"
                placeholder="Ex: Fuite d'eau cuisine"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Détails (Optionnel)</label>
            <textarea 
                className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl focus:border-orange-500 outline-none transition min-h-[100px]"
                placeholder="Décrivez le problème..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
        </div>

        {/* PHOTO (Simulée pour l'instant) */}
        <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30 cursor-pointer hover:bg-slate-900/50 transition hover:border-orange-500/50 group">
          <input type="file" accept="image/*" className="hidden" 
                 onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Camera className="w-6 h-6 text-slate-400 group-hover:text-orange-500" />
          </div>
          <span className="text-sm font-bold text-slate-400">
            {photo ? <span className="text-orange-500">{photo.name}</span> : "Ajouter une photo (Preuve)"}
          </span>
        </label>

        <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 bg-[#F59E0B] hover:bg-orange-500 text-black font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <FileText className="w-5 h-5"/>}
          ENVOYER LE TICKET
        </button>

      </form>
    </div>
  );
}
