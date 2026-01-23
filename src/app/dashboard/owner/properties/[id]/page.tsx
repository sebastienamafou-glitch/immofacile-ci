"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Loader2, ArrowLeft, MapPin, Home, Bath, BedDouble, Ruler, 
  UserPlus, Wrench, Settings, Maximize2, X, 
  ChevronLeft, ChevronRight, Pencil, Trash2, Save, Eye, EyeOff,
  Printer
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import Swal from "sweetalert2";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // ✅ Import Card ajouté

// Composants Métier
import PublishAkwabaModal from "@/components/owner/PublishAkwabaModal"; // ✅ Import du Modal Akwaba

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  
  // Galerie
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    price: 0,
    description: "",
    isPublished: true
  });

  // --- 1. CHARGEMENT SÉCURISÉ ---
  const fetchProperty = async () => {
    try {
      const stored = localStorage.getItem("immouser");
      if (!stored) { router.push('/login'); return; }
      const user = JSON.parse(stored);

      const res = await api.get(`/owner/properties/${id}`, {
         headers: { 'x-user-email': user.email }
      });
      if (res.data.success) {
        setProperty(res.data.property);
        setEditFormData({
            title: res.data.property.title,
            price: res.data.property.price,
            description: res.data.property.description || "",
            isPublished: res.data.property.isPublished
        });
      }
    } catch (error) {
      console.error("Erreur chargement", error);
      toast.error("Impossible de charger le bien.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProperty();
  }, [id]);

  // --- 2. SUPPRESSION SÉCURISÉE ---
  const handleDelete = async () => {
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    const result = await Swal.fire({
        title: 'Êtes-vous sûr ?',
        text: "Cette action supprimera le bien et ses historiques (sauf s'il y a un bail actif).",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.delete(`/owner/properties/${id}`, {
                headers: { 'x-user-email': user.email }
            });
            await Swal.fire({
                title: 'Supprimé !',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#0f172a', color: '#fff'
            });
            router.push('/dashboard/owner/properties');
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Impossible de supprimer.");
        }
    }
  };

  // --- 3. MISE À JOUR SÉCURISÉE ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    setIsUpdating(true);
    try {
        const res = await api.put(`/owner/properties/${id}`, editFormData, {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            setProperty(res.data.property);
            setIsEditModalOpen(false);
            toast.success("Mise à jour réussie !");
        }
    } catch (error) {
        toast.error("Erreur lors de la mise à jour.");
    } finally {
        setIsUpdating(false);
    }
  };

  // Navigation Galerie
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!property?.images) return;
    setSelectedImageIndex((prev) => (prev + 1) % property.images.length);
  };
  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!property?.images) return;
    setSelectedImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B1120]"><Loader2 className="w-10 h-10 animate-spin text-[#F59E0B]" /></div>;
  if (!property) return <div className="text-white text-center mt-20">Bien introuvable.</div>;

  return (
    <div className="p-6 lg:p-10 text-white min-h-screen bg-[#0B1120]">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard/owner/properties" className="flex items-center text-slate-400 hover:text-white gap-2 transition w-fit group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Retour à mes biens
          </Link>

          <div className="flex gap-3">
            <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-sm font-bold border border-slate-700"
            >
                <Pencil className="w-4 h-4" /> Modifier
            </button>
            <button 
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition text-sm font-bold border border-red-500/20"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GALERIE (GAUCHE) */}
        <div className="space-y-4">
          <div className="relative h-64 lg:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group">
             {property.images && property.images.length > 0 ? (
                <>
                    <Image 
                      src={property.images[selectedImageIndex]} 
                      alt={property.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <button onClick={() => setIsLightboxOpen(true)} className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 transition opacity-0 group-hover:opacity-100"><Maximize2 className="w-5 h-5" /></button>
                </>
             ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600"><Home className="w-20 h-20 mb-4 opacity-50" /><span>Pas de photo</span></div>
             )}

             <div className="absolute top-4 left-4 bg-[#F59E0B] text-[#0B1120] px-4 py-2 rounded-full font-black shadow-lg z-10">
                {property.price?.toLocaleString()} FCFA <span className="text-xs font-normal">/ mois</span>
             </div>
             
             <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                 <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${property.isPublished ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                    {property.isPublished ? 'Visible' : 'Masqué'}
                 </div>
                 <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${property.isAvailable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                    {property.isAvailable ? 'Disponible' : 'Loué'}
                 </div>
             </div>
          </div>
          
          {property.images && property.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {property.images.map((img: string, idx: number) => (
                      <div key={idx} onClick={() => setSelectedImageIndex(idx)} className={`relative w-24 h-20 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all ${selectedImageIndex === idx ? 'border-2 border-[#F59E0B] opacity-100' : 'border border-slate-700 opacity-60'}`}>
                          <Image src={img} alt={`Miniature ${idx}`} fill className="object-cover" />
                      </div>
                  ))}
              </div>
          )}
        </div>

        {/* INFOS (DROITE) */}
        <div className="flex flex-col gap-6">
            
            {/* 1. Description du bien */}
            <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700/50 shadow-xl">
                <h1 className="text-3xl font-black mb-2 leading-tight">{property.title}</h1>
                <div className="flex items-center gap-2 text-slate-400 mb-8">
                    <MapPin className="w-5 h-5 text-[#F59E0B]" /> {property.address}, {property.commune}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#0F172A] p-4 rounded-2xl text-center border border-slate-800">
                        <BedDouble className="w-6 h-6 text-[#F59E0B] mx-auto mb-2" />
                        <span className="font-bold block text-lg">{property.bedrooms}</span>
                    </div>
                    <div className="bg-[#0F172A] p-4 rounded-2xl text-center border border-slate-800">
                        <Bath className="w-6 h-6 text-[#F59E0B] mx-auto mb-2" />
                        <span className="font-bold block text-lg">{property.bathrooms}</span>
                    </div>
                    <div className="bg-[#0F172A] p-4 rounded-2xl text-center border border-slate-800">
                        <Ruler className="w-6 h-6 text-[#F59E0B] mx-auto mb-2" />
                        <span className="font-bold block text-lg">{property.surface}</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold mb-3 text-white border-b border-slate-700/50 pb-2">Description</h3>
                <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-wrap">
                    {property.description || "Aucune description détaillée."}
                </p>
            </div>

            {/* ✅ 2. BLOC AKWABA : PASSERELLE COURTE DURÉE (NOUVEAU) */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <CardHeader>
                    <CardTitle className="text-white text-sm uppercase tracking-wider font-black flex items-center gap-2">
                        <span className="text-xl">🚀</span> Rentabilité Turbo
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Votre bien est vide ? Transformez-le en location saisonnière (type Airbnb) sur 
                        <strong className="text-emerald-400 ml-1">Akwaba</strong> et multipliez vos revenus.
                    </p>
                    
                    {/* 👇 COMPOSANT MODAL D'ACTIVATION 👇 */}
                    <PublishAkwabaModal 
                        propertyId={property.id} 
                        propertyTitle={property.title}
                        suggestedPrice={property.price}
                    />
                    
                    <p className="text-[10px] text-slate-600 text-center mt-2">
                        * Une copie de ce bien sera créée dans l'espace "Séjours".
                    </p>
                </CardContent>
            </Card>

            {/* 3. Centre de Gestion */}
            <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700/50 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <Settings className="w-6 h-6 text-[#F59E0B]" /> Centre de Gestion
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsEditModalOpen(true)} className="flex flex-col items-center justify-center p-4 bg-[#0F172A] border border-slate-700 rounded-2xl hover:bg-blue-600 hover:text-white hover:border-blue-500 transition group">
                         <Pencil className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white transition" />
                         <span className="font-bold text-sm">Modifier Infos</span>
                    </button>

                    <Link href={`/dashboard/owner/tenants?propertyId=${property.id}`} className="flex flex-col items-center justify-center p-4 bg-[#0F172A] border border-slate-700 rounded-2xl hover:bg-[#F59E0B] hover:text-[#0B1120] hover:border-[#F59E0B] transition group">
                        <UserPlus className="w-8 h-8 mb-2 text-slate-400 group-hover:text-[#0B1120] transition" />
                        <span className="font-bold text-sm">Locataire</span>
                    </Link>

                    <Link href={`/dashboard/owner/maintenance?propertyId=${property.id}`} className="flex flex-col items-center justify-center p-4 bg-[#0F172A] border border-slate-700 rounded-2xl hover:bg-slate-700 hover:border-slate-500 transition group">
                        <Wrench className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white transition" />
                        <span className="font-bold text-sm">Maintenance</span>
                    </Link>

                    {/* BOUTON IMPRIMER AFFICHE */}
                    <a 
                        href={`/properties/flyer/${property.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-4 bg-[#0F172A] border border-slate-700 rounded-2xl hover:bg-white hover:text-black hover:border-white transition group"
                    >
                        <Printer className="w-8 h-8 mb-2 text-slate-400 group-hover:text-black transition" />
                        <span className="font-bold text-sm">Imprimer Affiche</span>
                    </a>

                    <button onClick={handleDelete} className="flex flex-col items-center justify-center p-4 bg-[#0F172A] border border-slate-700 rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition group">
                        <Trash2 className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white transition" />
                        <span className="font-bold text-sm">Supprimer</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* ... MODALE D'ÉDITION ... */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h3 className="text-xl font-bold text-white">Modifier le Bien</h3>
                    <button onClick={() => setIsEditModalOpen(false)}><X className="text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="editForm" onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Titre du bien</Label>
                            <Input 
                                value={editFormData.title}
                                onChange={e => setEditFormData({...editFormData, title: e.target.value})}
                                className="bg-slate-950 border-slate-700 text-white" required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Prix / Mois (FCFA)</Label>
                            <Input 
                                type="number"
                                value={editFormData.price}
                                onChange={e => setEditFormData({...editFormData, price: parseInt(e.target.value)})}
                                className="bg-slate-950 border-slate-700 text-white font-bold text-lg" required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Description</Label>
                            <Textarea 
                                value={editFormData.description}
                                onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                                className="bg-slate-950 border-slate-700 text-white min-h-[100px]"
                            />
                        </div>
                        
                        <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3">
                                {editFormData.isPublished ? <Eye className="text-blue-500"/> : <EyeOff className="text-slate-500"/>}
                                <div>
                                    <p className="font-bold text-sm text-white">Visibilité Publique</p>
                                    <p className="text-xs text-slate-400">{editFormData.isPublished ? "Visible sur le site" : "Masqué"}</p>
                                </div>
                            </div>
                            <Button 
                                type="button"
                                variant={editFormData.isPublished ? "default" : "secondary"}
                                onClick={() => setEditFormData({...editFormData, isPublished: !editFormData.isPublished})}
                                className={editFormData.isPublished ? "bg-blue-600" : "bg-slate-700"}
                            >
                                {editFormData.isPublished ? "Publié" : "Masqué"}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">Annuler</Button>
                    <Button type="submit" form="editForm" disabled={isUpdating} className="bg-[#F59E0B] hover:bg-yellow-500 text-black font-bold">
                        {isUpdating ? <Loader2 className="animate-spin mr-2 w-4 h-4"/> : <Save className="mr-2 w-4 h-4"/>}
                        Enregistrer
                    </Button>
                </div>
            </div>
        </div>
      )}

      {isLightboxOpen && property.images && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center">
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 z-50"><X className="w-8 h-8" /></button>
            <button onClick={prevImage} className="absolute left-4 lg:left-10 text-white p-3 z-50"><ChevronLeft className="w-10 h-10" /></button>
            <div className="relative w-full h-full max-w-5xl max-h-[85vh]"><Image src={property.images[selectedImageIndex]} alt="Full" fill className="object-contain"/></div>
            <button onClick={nextImage} className="absolute right-4 lg:right-10 text-white p-3 z-50"><ChevronRight className="w-10 h-10" /></button>
        </div>
      )}

    </div>
  );
}
