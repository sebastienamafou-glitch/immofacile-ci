"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation"; // ✅ useParams préféré
import { api } from "@/lib/api";
import { 
  Loader2, ArrowLeft, MapPin, Home, Bath, BedDouble, Ruler, 
  Wrench, Settings, X, ChevronLeft, ChevronRight, Save, Trash2, 
  User, CheckCircle, AlertTriangle, Plus, DollarSign
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Composants Métier
import PublishAkwabaModal from "@/components/PublishAkwabaModal";

// ✅ TYPES PRISMA OFFICIELS
import { Property, Lease, Incident, User as PrismaUser } from "@prisma/client";

// Extension du type pour inclure les relations
interface PropertyWithDetails extends Property {
    leases: (Lease & { tenant: PrismaUser | null })[];
    incidents: Incident[];
    agency: { name: string; email: string; phone: string } | null;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params?.id as string; // Sécurisation ID
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertyWithDetails | null>(null);
  
  // Galerie Lightbox
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Formulaire d'édition (State local)
  const [editForm, setEditForm] = useState({
      title: "", description: "", price: 0, 
      bedrooms: 0, bathrooms: 0, surface: 0
  });

  // 1. CHARGEMENT
  useEffect(() => {
    const fetchProperty = async () => {
        if(!id) return;
        
        try {
            const stored = localStorage.getItem("immouser");
            if (!stored) { router.push('/login'); return; }
            const user = JSON.parse(stored);

            const res = await api.get(`/owner/properties/${id}`, {
                headers: { 'x-user-email': user.email }
            });

            if (res.data.success) {
                setProperty(res.data.property);
                // Init form
                const p = res.data.property;
                setEditForm({
                    title: p.title, description: p.description || "", price: p.price,
                    bedrooms: p.bedrooms, bathrooms: p.bathrooms, surface: p.surface || 0
                });
            } else {
                throw new Error(res.data.error);
            }
        } catch (error) {
            console.error(error);
            toast.error("Impossible de charger le bien.");
            router.push('/dashboard/owner/properties');
        } finally {
            setLoading(false);
        }
    };
    fetchProperty();
  }, [id, router]);

  // 2. SUPPRESSION
  const handleDelete = async () => {
    const result = await Swal.fire({
        title: 'Supprimer ce bien ?',
        text: "Cette action est irréversible. Toutes les données associées (incidents, historique) seront perdues.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, supprimer définitivement',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            const stored = localStorage.getItem("immouser");
            const user = stored ? JSON.parse(stored) : null;
            
            await api.delete(`/owner/properties/${id}`, {
                headers: { 'x-user-email': user?.email }
            });
            
            toast.success("Bien supprimé.");
            router.push('/dashboard/owner/properties');
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erreur suppression.");
        }
    }
  };

  // 3. MISE À JOUR
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const stored = localStorage.getItem("immouser");
    const user = stored ? JSON.parse(stored) : null;

    try {
        const res = await api.put(`/owner/properties/${id}`, editForm, {
            headers: { 'x-user-email': user?.email }
        });
        if(res.data.success) {
            setProperty(res.data.property); // Mise à jour locale
            toast.success("Modifications enregistrées !");
            setIsEditModalOpen(false);
        }
    } catch (e) {
        toast.error("Erreur lors de la mise à jour.");
    } finally {
        setIsUpdating(false);
    }
  };

  // Lightbox Navigation
  const nextImage = () => {
    if(!property?.images) return;
    setSelectedImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  };
  const prevImage = () => {
    if(!property?.images) return;
    setSelectedImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="w-10 h-10 animate-spin text-[#F59E0B]" /></div>;
  if (!property) return null;

  // Calculs d'état
  const activeLease = property.leases.find(l => l.isActive);
  const isOccupied = !!activeLease;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6 lg:p-10 pb-20 font-sans">
      
      {/* HEADER NAVIGATION */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/dashboard/owner/properties" className="flex items-center text-slate-400 hover:text-white gap-2 transition text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Retour aux propriétés
        </Link>
        <div className="flex gap-3">
             {/* BOUTON AKWABA */}
             <PublishAkwabaModal 
                propertyId={property.id} 
                propertyTitle={property.title} 
                suggestedPrice={property.price} 
             />
             <Button variant="outline" onClick={() => setIsEditModalOpen(true)} className="border-slate-700 hover:bg-slate-800 text-slate-300">
                <Settings className="w-4 h-4 mr-2" /> Modifier
             </Button>
             <Button variant="destructive" onClick={handleDelete} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20">
                <Trash2 className="w-4 h-4" />
             </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : VISUELS & INFOS */}
        <div className="xl:col-span-2 space-y-8">
            
            {/* GALERIE */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative group h-[400px]">
                {property.images.length > 0 ? (
                    <>
                        <Image 
                            src={property.images[0]} 
                            alt={property.title} 
                            fill 
                            className="object-cover cursor-pointer hover:scale-105 transition duration-700"
                            onClick={() => setIsLightboxOpen(true)}
                        />
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2">
                            <Home className="w-3 h-3"/> +{property.images.length} photos
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 bg-slate-950">
                        <Home className="w-16 h-16 opacity-20" />
                    </div>
                )}
                
                {/* STATUS BADGE */}
                <div className="absolute top-4 left-4">
                    <Badge className={isOccupied ? "bg-blue-600" : "bg-emerald-500"}>
                        {isOccupied ? "LOUÉ" : "DISPONIBLE"}
                    </Badge>
                </div>
            </div>

            {/* DÉTAILS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h1 className="text-3xl font-black text-white mb-2">{property.title}</h1>
                <p className="text-slate-400 flex items-center gap-2 mb-6">
                    <MapPin className="w-4 h-4 text-[#F59E0B]" /> {property.address}, {property.commune}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 text-center">
                        <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{property.price.toLocaleString()} F</p>
                        <p className="text-[10px] text-slate-500 uppercase">Loyer</p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 text-center">
                        <BedDouble className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{property.bedrooms}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Chambres</p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 text-center">
                        <Bath className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{property.bathrooms}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Douches</p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-slate-800 text-center">
                        <Ruler className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                        <p className="text-xl font-bold text-white">{property.surface || "-"}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Surface m²</p>
                    </div>
                </div>

                <div className="prose prose-invert prose-sm max-w-none text-slate-400">
                    <h3 className="text-white font-bold uppercase text-xs tracking-wider mb-2">Description</h3>
                    <p>{property.description || "Aucune description fournie."}</p>
                </div>
            </div>

        </div>

        {/* COLONNE DROITE : STATUT & LOCATAIRE */}
        <div className="space-y-6">
            
            {/* CARTE LOCATAIRE */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <User className="text-blue-500" /> Locataire Actuel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeLease ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 font-bold text-xl border border-blue-500/20">
                                {activeLease.tenant?.name?.charAt(0)}
                            </div>
                            <p className="text-white font-bold text-lg">{activeLease.tenant?.name}</p>
                            <p className="text-slate-500 text-sm mb-4">{activeLease.tenant?.email}</p>
                            
                            <Link href={`/dashboard/owner/leases/${activeLease.id}`}>
                                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                    Voir le contrat
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-slate-500 text-sm italic mb-4">Ce bien est actuellement vacant.</p>
                            <Link href="/dashboard/owner/leases/new">
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                    <Plus className="w-4 h-4 mr-2" /> Ajouter un locataire
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CARTE INCIDENTS */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Wrench className="text-orange-500" /> Maintenance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {property.incidents.length > 0 ? (
                        <div className="space-y-3">
                            {property.incidents.slice(0, 3).map(inc => (
                                <div key={inc.id} className="flex justify-between items-center p-3 bg-[#0B1120] rounded-lg border border-slate-800">
                                    <span className="text-sm text-slate-300 truncate max-w-[150px]">{inc.title}</span>
                                    {inc.status === 'RESOLVED' ? (
                                        <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">RÉSOLU</span>
                                    ) : (
                                        <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded font-bold animate-pulse">EN COURS</span>
                                    )}
                                </div>
                            ))}
                            <Link href="/dashboard/owner/incidents">
                                <Button variant="link" className="w-full text-slate-500 text-xs mt-2">Voir tout l'historique</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                            <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                            Aucun incident signalé.
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
      </div>

      {/* --- MODALE ÉDITION (TIROIR) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h3 className="text-xl font-bold text-white">Modifier le bien</h3>
                    <button onClick={() => setIsEditModalOpen(false)}><X className="w-6 h-6 text-slate-400 hover:text-white"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="editForm" onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Titre</Label>
                            <Input className="bg-[#0B1120] border-slate-700 text-white" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Loyer</Label><Input type="number" className="bg-[#0B1120] border-slate-700 text-white" value={editForm.price} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} /></div>
                            <div className="space-y-2"><Label>Surface</Label><Input type="number" className="bg-[#0B1120] border-slate-700 text-white" value={editForm.surface} onChange={e => setEditForm({...editForm, surface: Number(e.target.value)})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Chambres</Label><Input type="number" className="bg-[#0B1120] border-slate-700 text-white" value={editForm.bedrooms} onChange={e => setEditForm({...editForm, bedrooms: Number(e.target.value)})} /></div>
                            <div className="space-y-2"><Label>SDB</Label><Input type="number" className="bg-[#0B1120] border-slate-700 text-white" value={editForm.bathrooms} onChange={e => setEditForm({...editForm, bathrooms: Number(e.target.value)})} /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea className="bg-[#0B1120] border-slate-700 text-white min-h-[100px]" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
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

      {/* --- LIGHTBOX GALERIE --- */}
      {isLightboxOpen && property.images.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center">
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 z-50"><X className="w-8 h-8" /></button>
            
            <button onClick={prevImage} className="absolute left-4 lg:left-10 text-white p-3 z-50 hover:bg-white/10 rounded-full transition"><ChevronLeft className="w-10 h-10" /></button>
            <div className="relative w-full h-full max-w-5xl max-h-[85vh] p-4">
                <Image src={property.images[selectedImageIndex]} alt="Full" fill className="object-contain"/>
            </div>
            <button onClick={nextImage} className="absolute right-4 lg:right-10 text-white p-3 z-50 hover:bg-white/10 rounded-full transition"><ChevronRight className="w-10 h-10" /></button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-mono bg-black/50 px-4 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {property.images.length}
            </div>
        </div>
      )}

    </div>
  );
}
