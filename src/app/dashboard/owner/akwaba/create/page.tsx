"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; // ✅ Import du wrapper sécurisé
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, Sparkles, MapPin, Home, 
  Wifi, Snowflake, Tv, Car, Utensils, CheckCircle2, Image as ImageIcon, ArrowLeft
} from "lucide-react";

// Import du composant ImageUpload
import ImageUpload from "@/components/dashboard/shared/ImageUpload";

// Liste des équipements disponibles
const AMENITIES_LIST = [
  { id: "wifi", label: "Wifi Fibre", icon: Wifi },
  { id: "ac", label: "Climatisation", icon: Snowflake },
  { id: "tv", label: "TV / Canal+", icon: Tv },
  { id: "parking", label: "Parking Sécurisé", icon: Car },
  { id: "kitchen", label: "Cuisine Équipée", icon: Utensils },
  { id: "pool", label: "Piscine", icon: Sparkles },
];

export default function CreateListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingProps, setFetchingProps] = useState(true);
  
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  // Formulaire
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pricePerNight: "",
    address: "",
    city: "Abidjan",
    neighborhood: "",
    images: [] as string[],
    amenities: {} as Record<string, boolean>
  });

  // 1. CHARGEMENT DES BIENS EXISTANTS (Smart Import)
  useEffect(() => {
    async function fetchProperties() {
        try {
            // ✅ APPEL SÉCURISÉ (On utilise la route standard existante)
            const res = await api.get('/owner/properties');
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (err) {
            console.error("Erreur chargement biens", err);
            // On ne bloque pas la page si ça échoue, c'est juste une aide à la saisie
        } finally {
            setFetchingProps(false);
        }
    }
    fetchProperties();
  }, []);

  // Logique "Smart Import"
  const handlePropertySelect = (propId: string) => {
    setSelectedPropertyId(propId);
    if (!propId) return;

    const prop = properties.find(p => p.id === propId);
    if (prop) {
        toast.success("Données importées depuis " + prop.title);
        setFormData(prev => ({
            ...prev,
            title: `Séjour à ${prop.commune} - ${prop.title}`,
            address: prop.address || "",
            city: prop.commune || "Abidjan",
            // On importe les images si elles existent, sinon on garde celles en cours
            images: (prop.images && prop.images.length > 0) ? prop.images : prev.images, 
            description: prop.description || ""
        }));
    }
  };

  const toggleAmenity = (key: string) => {
    setFormData(prev => ({
        ...prev,
        amenities: {
            ...prev.amenities,
            [key]: !prev.amenities[key]
        }
    }));
  };

  // 2. SOUMISSION DU FORMULAIRE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation Front
    if (formData.images.length === 0) {
        toast.error("Veuillez ajouter au moins une photo !");
        return;
    }

    setLoading(true);

    try {
        // ✅ POST SÉCURISÉ via Axios (Cookie inclus)
        const res = await api.post('/owner/akwaba/listings', {
            ...formData,
            // On s'assure que le prix est bien envoyé (le backend attend un nombre)
            pricePerNight: Number(formData.pricePerNight) 
        });

        if (res.data.success) {
            toast.success("Annonce publiée avec succès ! 🚀");
            router.push('/dashboard/owner/akwaba');
            router.refresh();
        }
    } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.error || "Erreur lors de la création";
        toast.error(msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 bg-[#0B1120] min-h-screen text-slate-200 font-sans">
        
        {/* HEADER */}
        <div className="mb-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2"/> Retour
            </Button>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Nouvelle Annonce <span className="text-orange-500">Akwaba</span></h1>
            <p className="text-slate-400 mt-1">Configurez votre bien pour la location courte durée.</p>
        </div>

        {/* SECTION SMART IMPORT */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-orange-500/30 p-6 rounded-2xl mb-8 shadow-lg shadow-orange-900/10">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">Gagnez du temps !</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Importez automatiquement les photos et l'adresse d'un bien que vous gérez déjà.
                    </p>
                    {fetchingProps ? (
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="animate-spin w-4 h-4"/> Chargement des biens...</div>
                    ) : (
                        <div className="relative">
                            <select 
                                className="w-full bg-black/40 border border-slate-600 text-white rounded-xl h-12 px-4 focus:border-orange-500 outline-none appearance-none cursor-pointer font-medium"
                                value={selectedPropertyId}
                                onChange={(e) => handlePropertySelect(e.target.value)}
                            >
                                <option value="">-- Sélectionner un bien existant --</option>
                                {properties.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.title} ({p.commune})</option>
                                ))}
                            </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">▼</div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. INFO DE BASE */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Home className="w-5 h-5 text-orange-500" /> Informations Générales
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                        <Label className="text-slate-400 font-bold text-xs uppercase">Titre de l'annonce</Label>
                        <Input 
                            required 
                            placeholder="Ex: Villa Luxueuse avec Piscine - Cocody" 
                            className="bg-slate-950 border-slate-700 text-white h-12 text-lg focus:border-orange-500"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold text-xs uppercase">Prix par nuit (FCFA)</Label>
                        <Input 
                            required 
                            type="number"
                            placeholder="Ex: 45000" 
                            className="bg-slate-950 border-slate-700 text-white h-12 font-mono text-lg text-orange-500 font-bold focus:border-orange-500"
                            value={formData.pricePerNight}
                            onChange={e => setFormData({...formData, pricePerNight: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold text-xs uppercase">Ville / Commune</Label>
                        <Input 
                            required 
                            placeholder="Ex: Abidjan, Marcory" 
                            className="bg-slate-950 border-slate-700 text-white h-12 focus:border-orange-500"
                            value={formData.city}
                            onChange={e => setFormData({...formData, city: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label className="text-slate-400 font-bold text-xs uppercase">Adresse précise / Quartier</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                            <Input 
                                placeholder="Ex: Zone 4, Rue du canal..." 
                                className="pl-10 bg-slate-950 border-slate-700 text-white h-12 focus:border-orange-500"
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label className="text-slate-400 font-bold text-xs uppercase">Description</Label>
                        <Textarea 
                            placeholder="Décrivez votre logement..." 
                            className="bg-slate-950 border-slate-700 text-white min-h-[120px] focus:border-orange-500"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* 2. PHOTOS */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <ImageIcon className="w-5 h-5 text-orange-500" /> Galerie Photos
                </h3>
                <ImageUpload 
                    value={formData.images}
                    onChange={(newImages) => setFormData({ ...formData, images: newImages })}
                    onRemove={(urlToRemove) => setFormData({
                        ...formData,
                        images: formData.images.filter((url) => url !== urlToRemove)
                    })}
                />
            </div>

            {/* 3. ÉQUIPEMENTS */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" /> Équipements & Confort
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {AMENITIES_LIST.map((item) => {
                        const Icon = item.icon;
                        const isChecked = !!formData.amenities[item.id];
                        
                        return (
                            <div 
                                key={item.id}
                                onClick={() => toggleAmenity(item.id)}
                                className={`
                                    cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group
                                    ${isChecked 
                                        ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/20 scale-[1.02]' 
                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                                    }
                                `}
                            >
                                <Icon className={`w-6 h-6 ${isChecked ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                <span className="font-bold text-sm">{item.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 pb-20">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white"
                >
                    Annuler
                </Button>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-orange-500/20 transition hover:scale-105 active:scale-95"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : "Publier l'annonce"}
                </Button>
            </div>

        </form>
    </div>
  );
}
