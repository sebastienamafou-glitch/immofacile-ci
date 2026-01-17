"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ArrowLeft, Home, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner"; // Ou Swal si vous préférez, mais toast est bien ici
import Link from "next/link";

// ✅ 1. TYPAGE STRICT pour le Select
interface PropertyOption {
  id: string;
  title: string;
  commune: string;
}

export default function ReportIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);
  
  // États du formulaire
  const [properties, setProperties] = useState<PropertyOption[]>([]); // Typage appliqué
  const [selectedProperty, setSelectedProperty] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // 1. Charger les propriétés au montage (Sécurisé)
  useEffect(() => {
    const fetchProperties = async () => {
        if (typeof window === "undefined") return;
        
        const stored = localStorage.getItem("immouser");
        if (!stored) { router.push('/login'); return; }
        const user = JSON.parse(stored);

        try {
            // Utilisation de l'API existante
            const res = await api.get('/owner/tenant-form-data', {
                headers: { 'x-user-email': user.email }
            });
            
            if (res.data.success) {
                // ✅ SÉCURISATION DU MAPPING
                // On transforme les données brutes en format propre pour le Select
                const cleanProps = (res.data.properties || []).map((p: any) => ({
                    id: p.id,
                    title: p.title || "Bien sans nom",
                    commune: p.commune || "Adresse inconnue"
                }));
                setProperties(cleanProps);
            }
        } catch (e) {
            console.error(e);
            toast.error("Impossible de charger la liste des biens.");
        } finally {
            setLoadingProps(false);
        }
    };
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    if (!selectedProperty) {
        toast.error("Veuillez sélectionner une propriété concernée.");
        return;
    }

    setLoading(true);
    
    // Construction du payload
    const payload = {
        title: title.trim(),
        description: description.trim(),
        propertyId: selectedProperty,
        // TODO: Gestion réelle de l'upload photo (nécessite FormData ou S3)
        // Pour l'instant on passe null ou le nom pour éviter une erreur backend
        photo: photo ? photo.name : null 
    };

    try {
      await api.post("/owner/incidents", payload, {
          headers: { 'x-user-email': user.email }
      });
      
      toast.success("Incident signalé avec succès !");
      // Redirection après un court délai pour l'UX
      setTimeout(() => {
          router.push("/dashboard/owner/maintenance");
      }, 500);
      
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi du signalement.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProps) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10"/>
        <p className="text-slate-500 text-sm font-mono">Chargement de vos biens...</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20">
      
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
            <Link href="/dashboard/owner/maintenance" className="flex items-center text-slate-400 hover:text-white gap-2 transition w-fit mb-4 text-sm font-bold">
                <ArrowLeft className="w-4 h-4" /> Annuler et Retour
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                <AlertTriangle className="text-orange-500 w-8 h-8" /> Signaler un problème
            </h1>
            <p className="text-slate-400 text-sm mt-2">
                Ouvrez un ticket de maintenance pour suivre les réparations sur l'un de vos biens.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl">
            
            {/* SÉLECTEUR DE PROPRIÉTÉ */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Propriété concernée <span className="text-red-500">*</span></label>
                <div className="relative group">
                    <Home className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                    <select 
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl appearance-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-white font-medium"
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        required
                    >
                        <option value="">-- Sélectionnez un bien --</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title} • {p.commune}
                            </option>
                        ))}
                    </select>
                </div>
                {properties.length === 0 && (
                    <p className="text-xs text-orange-400 mt-1">Aucun bien trouvé. Ajoutez d'abord une propriété.</p>
                )}
            </div>

            {/* TITRE */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Titre de l'incident <span className="text-red-500">*</span></label>
                <input 
                    className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl focus:border-orange-500 outline-none transition text-white placeholder:text-slate-600 font-bold"
                    placeholder="Ex: Fuite d'eau sous évier"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Description détaillée</label>
                <textarea 
                    className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl focus:border-orange-500 outline-none transition min-h-[120px] text-white placeholder:text-slate-600 leading-relaxed"
                    placeholder="Décrivez le problème, l'urgence et les accès possibles..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* PHOTO (Upload Stylisé) */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400 ml-1">Preuve photo (Optionnel)</label>
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/50 cursor-pointer hover:bg-slate-900 transition hover:border-orange-500/50 group">
                    <input type="file" accept="image/*" className="hidden" 
                            onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                    
                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-lg">
                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-orange-500" />
                    </div>
                    
                    <span className="text-sm font-bold text-slate-400 group-hover:text-white transition">
                        {photo ? (
                            <span className="text-orange-500 flex items-center gap-2">
                                <FileText className="w-4 h-4"/> {photo.name}
                            </span>
                        ) : "Cliquez pour ajouter une photo"}
                    </span>
                    <span className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-wider">JPG, PNG - Max 5MB</span>
                </label>
            </div>

            <button 
                type="submit" 
                disabled={loading || properties.length === 0} 
                className="w-full py-4 bg-[#F59E0B] hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-black font-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wide mt-4"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <FileText className="w-5 h-5"/>}
                {loading ? "Envoi en cours..." : "Créer le ticket de maintenance"}
            </button>

        </form>
      </div>
    </div>
  );
}
