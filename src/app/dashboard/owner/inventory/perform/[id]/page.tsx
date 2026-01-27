"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle, ArrowLeft, Home, Utensils, Armchair, Bath, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Lease, Property, User } from "@prisma/client";

// Typage strict (Jointure)
type LeaseWithDetails = Lease & {
    property: Property;
    tenant: User;
};

export default function NewInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // --- ÉTAPE 1 : GESTION ID ---
  const initialLeaseId = searchParams.get('leaseId') || "";
  
  const [leases, setLeases] = useState<LeaseWithDetails[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(initialLeaseId);
  const [step, setStep] = useState(initialLeaseId ? 2 : 1);
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);

  // --- ÉTAPE 2 : FORMULAIRE ---
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // ENUMS PRISMA STRICTS
  const [type, setType] = useState<"ETAT_DES_LIEUX_ENTREE" | "ETAT_DES_LIEUX_SORTIE">("ETAT_DES_LIEUX_ENTREE");
  
  const [rooms, setRooms] = useState({
    kitchen: { state: "BON", photo: null as File | null, preview: "" },
    living: { state: "BON", photo: null as File | null, preview: "" },
    bath: { state: "BON", photo: null as File | null, preview: "" },
  });
  const [comment, setComment] = useState("");

  // 1. CHARGEMENT DES DONNÉES (ZERO TRUST)
  useEffect(() => {
    const fetchLeases = async () => {
        try {
            // ✅ APPEL SÉCURISÉ : Cookie Only
            const res = await api.get('/owner/leases');
            
            if (res.data.success) {
                // On ne prend que les baux ACTIFS ou EN ATTENTE pour un état des lieux
                const activeLeases = res.data.leases.filter((l: Lease) => l.status !== 'CANCELLED');
                setLeases(activeLeases);
                
                // Hydratation si ID présent
                if (selectedLeaseId) {
                    const found = activeLeases.find((l: LeaseWithDetails) => l.id === selectedLeaseId);
                    if (found) setSelectedLease(found);
                }
            }
        } catch (e: any) { 
            console.error(e);
            if (e.response?.status === 401) router.push('/login');
            else toast.error("Impossible de charger les contrats.");
        } finally {
            setFetching(false);
        }
    };
    fetchLeases();
  }, [selectedLeaseId, router]);

  // Gestion Photos
  const handlePhoto = (roomKey: 'kitchen' | 'living' | 'bath', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        // Preview locale immédiate
        const previewUrl = URL.createObjectURL(file);
        setRooms(prev => ({
            ...prev,
            [roomKey]: { ...prev[roomKey], photo: file, preview: previewUrl }
        }));
    }
  };

  // Gestion États
  const handleState = (roomKey: 'kitchen' | 'living' | 'bath', val: string) => {
    setRooms(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], state: val } }));
  };

  // SOUMISSION (MULTIPART/FORM-DATA)
  const handleSubmit = async () => {
    if (!selectedLeaseId) return;
    setLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('leaseId', selectedLeaseId);
        formData.append('type', type);
        
        // Données textuelles
        formData.append('kitchenState', rooms.kitchen.state);
        formData.append('livingState', rooms.living.state);
        formData.append('bathState', rooms.bath.state);
        formData.append('comment', comment);
        
        // Fichiers Binaires
        if(rooms.kitchen.photo) formData.append('kitchenPhoto', rooms.kitchen.photo);
        if(rooms.living.photo) formData.append('livingPhoto', rooms.living.photo);
        if(rooms.bath.photo) formData.append('bathPhoto', rooms.bath.photo);

        // ✅ APPEL SÉCURISÉ : Pas de headers manuels (L'API route.ts gère l'upload)
        const res = await api.post('/owner/inventory', formData, {
            headers: { 'Content-Type': 'multipart/form-data' } // Important pour les fichiers
        });
        
        if (res.data.success) {
            toast.success("État des lieux enregistré et archivé ! 📸");
            router.push('/dashboard/owner/inventory');
        }
    } catch (e: any) {
        console.error(e);
        toast.error(e.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
        setLoading(false);
    }
  };

  // --- VUE 1 : SÉLECTEUR DE BAIL ---
  if (step === 1) {
      if (fetching) return <div className="h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-[#F59E0B]"/></div>;

      return (
        <div className="min-h-screen bg-[#0B1120] text-white p-6 flex flex-col items-center justify-center font-sans">
            <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Nouvel État des Lieux</h1>
                    <p className="text-slate-400">Sélectionnez le contrat concerné :</p>
                </div>
                
                <div className="space-y-3">
                    {leases.map(lease => (
                        <button 
                            key={lease.id}
                            onClick={() => { 
                                setSelectedLeaseId(lease.id); 
                                setSelectedLease(lease);
                                setStep(2); 
                            }}
                            className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:bg-slate-800 hover:border-[#F59E0B] transition group text-left shadow-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 border border-slate-700">
                                    {/* ✅ CORRECTIF SÉCURITÉ : Fallback si name est null */}
                                    {(lease.tenant.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-white group-hover:text-[#F59E0B] transition">{lease.property.title}</p>
                                    <p className="text-xs text-slate-500">
                                        {/* ✅ CORRECTIF SÉCURITÉ : Affichage par défaut */}
                                        {lease.tenant.name || "Locataire sans nom"}
                                    </p>
                                </div>
                            </div>
                            <ArrowLeft className="w-5 h-5 text-slate-600 rotate-180" />
                        </button>
                    ))}
                    {leases.length === 0 && (
                        <div className="text-center text-slate-500 py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-800 flex flex-col items-center gap-2">
                            <AlertCircle className="w-8 h-8 opacity-50"/>
                            <p>Aucun bail actif disponible.</p>
                        </div>
                    )}
                </div>
                <Button variant="outline" onClick={() => router.back()} className="w-full border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white">Annuler</Button>
            </div>
        </div>
      );
  }

  // --- VUE 2 : FORMULAIRE ---
  if (!selectedLease) return <div className="h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-[#F59E0B]"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white pb-32 font-sans">
      
      {/* HEADER MOBILE */}
      <header className="sticky top-0 z-20 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between shadow-sm">
        <button onClick={() => setStep(1)} className="text-slate-400 text-sm flex items-center gap-1 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest text-[#F59E0B]">Constat Numérique</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* INFO CONTEXTE */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#F59E0B]/10 rounded-bl-full -mr-4 -mt-4"></div>
            
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                <Home className="w-3 h-3" /> Propriété & Locataire
            </p>
            <p className="font-bold text-white text-lg leading-tight truncate">{selectedLease.property.title}</p>
            <p className="text-sm text-slate-400 mt-1">{selectedLease.tenant.name || "Locataire"}</p>
            
            {/* Switch Type */}
            <div className="flex bg-black rounded-xl p-1 mt-5 border border-slate-700">
                <button 
                    onClick={() => setType("ETAT_DES_LIEUX_ENTREE")} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${type === "ETAT_DES_LIEUX_ENTREE" ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    ENTRÉE 📥
                </button>
                <button 
                    onClick={() => setType("ETAT_DES_LIEUX_SORTIE")} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${type === "ETAT_DES_LIEUX_SORTIE" ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    SORTIE 📤
                </button>
            </div>
        </div>

        {/* --- PIÈCES --- */}
        {[
            { id: 'kitchen', icon: Utensils, label: 'Cuisine', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'focus:border-blue-500' },
            { id: 'living', icon: Armchair, label: 'Salon', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'focus:border-orange-500' },
            { id: 'bath', icon: Bath, label: 'SDB', color: 'text-teal-400', bg: 'bg-teal-900/20', border: 'focus:border-teal-500' }
        ].map((room) => (
            <section key={room.id} className="space-y-3">
                <div className={`flex items-center gap-3 ${room.color}`}>
                    <span className={`${room.bg} p-2 rounded-lg`}><room.icon className="w-5 h-5" /></span>
                    <h2 className="text-lg font-bold text-white">{room.label}</h2>
                </div>
                
                <div className="grid gap-3">
                    <select 
                        className={`bg-slate-950 border border-slate-800 text-white h-12 rounded-xl px-4 w-full outline-none ${room.border} transition-colors appearance-none font-medium`}
                        onChange={(e) => handleState(room.id as any, e.target.value)}
                        value={(rooms as any)[room.id].state}
                    >
                        <option value="NEUF">✨ État Neuf</option>
                        <option value="BON">✅ Bon état</option>
                        <option value="MOYEN">⚠️ État d'usage</option>
                        <option value="DEGRADE">❌ Dégradé</option>
                    </select>

                    <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer overflow-hidden h-40 group ${(rooms as any)[room.id].preview ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900'}`}>
                        {(rooms as any)[room.id].preview && (
                            <img src={(rooms as any)[room.id].preview} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />
                        )}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(room.id as any, e)} />
                        <div className="relative z-10 flex flex-col items-center">
                            {(rooms as any)[room.id].preview ? (
                                <>
                                    <CheckCircle className="w-10 h-10 text-emerald-500 mb-2 shadow-black drop-shadow-lg" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide bg-emerald-900/80 px-2 py-1 rounded">Photo Enregistrée</span>
                                </>
                            ) : (
                                <>
                                    <Camera className="w-8 h-8 text-slate-500 mb-2 group-hover:text-white transition" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide group-hover:text-white">Ajouter Photo</span>
                                </>
                            )}
                        </div>
                    </label>
                </div>
            </section>
        ))}

        {/* COMMENTAIRE */}
        <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Observations Finales</h2>
            <Textarea 
                placeholder="Dégâts constatés, relevé compteurs, nombre de clés remises..." 
                className="w-full bg-slate-950 border border-slate-800 text-white min-h-[120px] rounded-xl p-4 focus:border-[#F59E0B] outline-none placeholder:text-slate-700 resize-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
        </section>

        {/* BOUTON VALIDATION */}
        <div className="fixed bottom-0 left-0 w-full bg-[#0B1120]/80 backdrop-blur-lg p-4 border-t border-slate-800">
            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full max-w-md mx-auto h-14 bg-[#F59E0B] hover:bg-yellow-400 text-black font-black text-lg rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin w-6 h-6"/> : "✍️ SIGNER ET VALIDER"}
            </button>
        </div>

      </main>
    </div>
  );
}
