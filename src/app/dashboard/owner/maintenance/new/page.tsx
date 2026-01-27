"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ArrowLeft, Home, FileText, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Property } from "@prisma/client";

export default function ReportIncidentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Form State
  const [selectedProperty, setSelectedProperty] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 1. CHARGER LES PROPRIÉTÉS (ZERO TRUST)
  useEffect(() => {
    const fetchProperties = async () => {
        try {
            // ✅ APPEL SÉCURISÉ : Cookie Only
            const res = await api.get('/owner/properties');
            
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (e: any) { 
            console.error(e); 
            if (e.response?.status === 401) router.push('/login');
        }
    };
    fetchProperties();
  }, [router]);

  // Gestion Photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setPhoto(file);
          setPhotoPreview(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) {
        toast.error("Veuillez choisir une propriété.");
        return;
    }

    setLoading(true);
    
    try {
      // ✅ FORM DATA pour Upload Image
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('propertyId', selectedProperty);
      if (photo) {
          formData.append('photo', photo);
      }

      // ✅ APPEL SÉCURISÉ : Pas de headers manuels
      await api.post("/owner/incidents", formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success("Ticket créé avec succès !");
      router.push("/dashboard/owner/incidents"); 
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 bg-[#0B1120] min-h-screen text-white pb-20 font-sans">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/owner/incidents" className="flex items-center text-slate-400 hover:text-white gap-2 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour liste
        </Link>
        
        <h1 className="text-3xl font-black uppercase flex items-center gap-3 mb-2">
            <AlertTriangle className="text-orange-500" /> Nouveau Signalement
        </h1>
        <p className="text-slate-400 text-sm mb-8">Déclarez une panne ou un besoin de réparation.</p>

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
            
            {/* PROPRIÉTÉ */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Propriété <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Home className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <select 
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 appearance-none font-bold"
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
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
                <label className="text-xs font-bold uppercase text-slate-500">Titre <span className="text-red-500">*</span></label>
                <input 
                    required
                    placeholder="Ex: Fuite robinet cuisine"
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 font-bold"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Détails</label>
                <textarea 
                    placeholder="Précisez le problème..."
                    className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-orange-500 min-h-[100px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* PHOTO */}
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Photo (Preuve)</label>
                
                {!photoPreview ? (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/50 cursor-pointer hover:border-orange-500 hover:bg-slate-900 transition group">
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        <Camera className="w-8 h-8 text-slate-500 group-hover:text-orange-500 mb-2 transition" />
                        <span className="text-sm text-slate-400 group-hover:text-white">Ajouter une photo</span>
                    </label>
                ) : (
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700 group">
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            type="button"
                            onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition backdrop-blur-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-black font-black rounded-xl shadow-lg shadow-orange-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : "CRÉER LE TICKET"}
            </button>
        </form>
      </div>
    </div>
  );
}
