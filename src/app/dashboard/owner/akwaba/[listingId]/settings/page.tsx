"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api"; // ✅ Utilisation du wrapper sécurisé
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Swal from 'sweetalert2';
import { 
  Loader2, ArrowLeft, Save, Trash2, Wifi, Snowflake, Tv, Car, Utensils, Sparkles
} from "lucide-react";
import ImageUpload from "@/components/dashboard/shared/ImageUpload";

// ✅ Typage Strict
interface ListingData {
    title: string;
    description: string;
    pricePerNight: string;
    address: string;
    city: string;
    neighborhood: string;
    images: string[];
    amenities: Record<string, boolean>; // JSON
    isPublished: boolean;
}

const AMENITIES_LIST = [
  { id: "wifi", label: "Wifi Fibre", icon: Wifi },
  { id: "ac", label: "Climatisation", icon: Snowflake },
  { id: "tv", label: "TV / Canal+", icon: Tv },
  { id: "parking", label: "Parking Sécurisé", icon: Car },
  { id: "kitchen", label: "Cuisine Équipée", icon: Utensils },
  { id: "pool", label: "Piscine", icon: Sparkles },
];

export default function EditListingPage({ params }: { params: { listingId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State typé
  const [formData, setFormData] = useState<ListingData>({
    title: "", description: "", pricePerNight: "",
    address: "", city: "", neighborhood: "",
    images: [], amenities: {}, isPublished: false
  });

  // 1. Charger les données (Zero Trust)
  useEffect(() => {
    async function fetchListing() {
        try {
            // ✅ Appel sécurisé via axios (cookie inclus)
            const res = await api.get(`/owner/akwaba/listings/${params.listingId}`);
            if (res.data) {
                setFormData({
                    ...res.data,
                    pricePerNight: res.data.pricePerNight ? res.data.pricePerNight.toString() : "",
                    amenities: res.data.amenities || {}
                });
            }
        } catch (error: any) {
            console.error("Erreur chargement", error);
            if(error.response?.status === 401) router.push('/login');
            else toast.error("Impossible de charger l'annonce");
        } finally {
            setLoading(false);
        }
    }
    fetchListing();
  }, [params.listingId, router]);

  // 2. Sauvegarder (PUT)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        // ✅ Appel sécurisé
        await api.put(`/owner/akwaba/listings/${params.listingId}`, formData);
        
        toast.success("Modifications enregistrées !");
        router.refresh();
        router.push(`/dashboard/owner/akwaba/${params.listingId}`); // Retour à la page détail

    } catch (error) {
        toast.error("Erreur lors de la mise à jour");
    } finally {
        setSaving(false);
    }
  };

  // 3. Supprimer (DELETE)
  const handleDelete = async () => {
    const result = await Swal.fire({
        title: 'Suppression Définitive',
        text: "Attention : Cette action effacera l'annonce et tout son historique.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        background: '#0F172A',
        color: '#fff'
    });

    if (result.isConfirmed) {
        setSaving(true);
        try {
            // ✅ Appel sécurisé
            await api.delete(`/owner/akwaba/listings/${params.listingId}`);
            
            await Swal.fire({
                 title: 'Supprimé !', text: 'Annonce retirée avec succès.', 
                 icon: 'success', background: '#0F172A', color: '#fff',
                 confirmButtonColor: '#F59E0B'
            });
            router.push('/dashboard/owner/akwaba');

        } catch (error: any) {
            const msg = error.response?.data?.error || "Impossible de supprimer.";
            Swal.fire({
                title: 'Blocage', text: msg, 
                icon: 'error', background: '#0F172A', color: '#fff'
           });
        } finally {
            setSaving(false);
        }
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24 bg-[#0B1120] min-h-screen text-slate-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/owner/akwaba/${params.listingId}`}>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white">Paramètres Annonce</h1>
                    <p className="text-slate-400 text-sm">Modifiez les détails de diffusion.</p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                <span className={`text-sm font-bold ${formData.isPublished ? "text-emerald-400" : "text-slate-500"}`}>
                    {formData.isPublished ? "EN LIGNE" : "BROUILLON"}
                </span>
                <Switch 
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData({...formData, isPublished: checked})}
                    className="data-[state=checked]:bg-emerald-500"
                />
            </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* PHOTOS */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-4 shadow-xl">
                 <h3 className="font-bold text-white text-lg mb-2">Galerie Photos</h3>
                 <ImageUpload 
                    value={formData.images}
                    onChange={(imgs) => setFormData({...formData, images: imgs})}
                    onRemove={(url) => setFormData({...formData, images: formData.images.filter((i) => i !== url)})}
                 />
            </div>

            {/* INFO GÉNÉRALES */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-6 shadow-xl">
                <h3 className="font-bold text-white text-lg mb-2">Informations Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Titre de l'annonce</Label>
                        <Input 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            className="bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Prix par Nuit (FCFA)</Label>
                        <Input 
                            type="number"
                            value={formData.pricePerNight} 
                            onChange={e => setFormData({...formData, pricePerNight: e.target.value})} 
                            className="bg-slate-950 border-slate-800 text-white font-mono text-lg font-bold text-orange-500 h-12 focus:border-orange-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Ville / Commune</Label>
                        <Input 
                            value={formData.city} 
                            onChange={e => setFormData({...formData, city: e.target.value})} 
                            className="bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Description détaillée</Label>
                        <Textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="bg-slate-950 border-slate-800 text-white min-h-[150px] focus:border-orange-500 p-4 leading-relaxed"
                        />
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-800">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 transition w-full md:w-auto"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer définitivement
                </Button>

                <div className="flex gap-4 w-full md:w-auto">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white flex-1 md:flex-none">
                        Annuler
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500 text-white min-w-[180px] h-12 rounded-xl font-bold shadow-lg shadow-orange-600/20 flex-1 md:flex-none">
                        {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> ENREGISTRER</>}
                    </Button>
                </div>
            </div>
        </form>
    </div>
  );
}
