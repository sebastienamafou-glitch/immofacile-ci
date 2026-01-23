"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Swal from 'sweetalert2';
import { 
  Loader2, ArrowLeft, Save, Trash2, MapPin, 
  Wifi, Snowflake, Tv, Car, Utensils, Sparkles
} from "lucide-react";

import ImageUpload from "@/components/dashboard/shared/ImageUpload";

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
  
  // State du formulaire
  const [formData, setFormData] = useState<any>({
    title: "", description: "", pricePerNight: "",
    address: "", city: "", neighborhood: "",
    images: [], amenities: {}, isPublished: false
  });

  // 1. Charger les données existantes
  useEffect(() => {
    async function fetchListing() {
        try {
            // On peut réutiliser la route GET listings globale et filtrer, 
            // ou mieux : créer un GET dans la route dynamique que je vous ai donnée
            // (Note: J'ai omis le GET dans l'étape 2 pour alléger, mais NextJS 
            // permet d'appeler prisma directement dans un Server Component. 
            // Ici on est en Client, on va supposer que le dashboard parent a passé la donnée 
            // ou on fait un fetch simple si vous avez ajouté le GET à la route.)
            
            // Pour simplifier l'intégration immédiate sans toucher au route.ts GET :
            // On va utiliser l'API listing public ou dashboard si dispo, sinon :
            // AJOUTEZ LE 'GET' DANS LE FICHIER route.ts SI CE N'EST PAS FAIT
            // (Voir note en bas de réponse)
            
            const res = await fetch(`/api/owner/akwaba/listings/${params.listingId}`); // Il faut que le GET existe !
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...data,
                    pricePerNight: data.pricePerNight.toString()
                });
            } else {
                toast.error("Impossible de charger l'annonce");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchListing();
  }, [params.listingId]);

  // 2. Sauvegarder
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        const res = await fetch(`/api/owner/akwaba/listings/${params.listingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            toast.success("Modifications enregistrées !");
            router.refresh();
        } else {
            toast.error("Erreur lors de la mise à jour");
        }
    } catch (error) {
        toast.error("Erreur serveur");
    } finally {
        setSaving(false);
    }
  };

  // 3. Supprimer
  const handleDelete = async () => {
    const result = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: "Cette action est irréversible et supprimera l'annonce.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        background: '#0B1120',
        color: '#fff'
    });

    if (result.isConfirmed) {
        setSaving(true);
        try {
            const res = await fetch(`/api/owner/akwaba/listings/${params.listingId}`, {
                method: 'DELETE'
            });
            const json = await res.json();

            if (res.ok) {
                await Swal.fire({
                     title: 'Supprimé!', text: 'Votre annonce a été retirée.', 
                     icon: 'success', background: '#0B1120', color: '#fff'
                });
                router.push('/dashboard/owner/akwaba');
            } else {
                Swal.fire({
                    title: 'Erreur', text: json.error || "Impossible de supprimer.", 
                    icon: 'error', background: '#0B1120', color: '#fff'
               });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/owner/akwaba/${params.listingId}`}>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white">Modifier l'annonce</h1>
                    <p className="text-slate-400 text-sm">Mettez à jour les informations et les photos.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400 mr-2">En ligne</span>
                <Switch 
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData({...formData, isPublished: checked})}
                    className="data-[state=checked]:bg-green-500"
                />
            </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8">
            
            {/* PHOTOS */}
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl space-y-4">
                 <h3 className="font-bold text-white">Photos</h3>
                 <ImageUpload 
                    value={formData.images}
                    onChange={(imgs) => setFormData({...formData, images: imgs})}
                    onRemove={(url) => setFormData({...formData, images: formData.images.filter((i:string) => i !== url)})}
                 />
            </div>

            {/* INFO */}
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                        <Label>Titre</Label>
                        <Input 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            className="bg-black/20 border-slate-700 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Prix / Nuit (FCFA)</Label>
                        <Input 
                            type="number"
                            value={formData.pricePerNight} 
                            onChange={e => setFormData({...formData, pricePerNight: e.target.value})} 
                            className="bg-black/20 border-slate-700 text-white font-mono text-orange-500 font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Ville</Label>
                        <Input 
                            value={formData.city} 
                            onChange={e => setFormData({...formData, city: e.target.value})} 
                            className="bg-black/20 border-slate-700 text-white"
                        />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="bg-black/20 border-slate-700 text-white min-h-[100px]"
                        />
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={saving}
                    className="bg-red-500/10 hover:bg-red-900/50 text-red-500 border border-red-500/20"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer l'annonce
                </Button>

                <div className="flex gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()} className="text-slate-400">
                        Annuler
                    </Button>
                    <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-500 text-white min-w-[150px]">
                        {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
                    </Button>
                </div>
            </div>
        </form>
    </div>
  );
}
