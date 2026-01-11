"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CheckCircle, ArrowLeft, Save, Home, Utensils, Armchair, Bath } from "lucide-react";

export default function InventoryPage() {
  const { id } = useParams(); // ID du Bail
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [lease, setLease] = useState<any>(null);
  
  // État du formulaire
  const [rooms, setRooms] = useState({
    kitchen: { state: "", photo: null as File | null, preview: "" },
    living: { state: "", photo: null as File | null, preview: "" },
    bath: { state: "", photo: null as File | null, preview: "" },
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    // Récupérer les infos du bail pour afficher l'adresse
    const fetchLease = async () => {
        try {
            const { data } = await api.get(`/leases/${id}`);
            setLease(data);
        } catch (e) { console.error(e); }
    };
    if (id) fetchLease();
  }, [id]);

  const handlePhoto = (roomKey: 'kitchen' | 'living' | 'bath', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setRooms(prev => ({
            ...prev,
            [roomKey]: { ...prev[roomKey], photo: file, preview: URL.createObjectURL(file) }
        }));
    }
  };

  const handleState = (roomKey: 'kitchen' | 'living' | 'bath', val: string) => {
    setRooms(prev => ({
        ...prev,
        [roomKey]: { ...prev[roomKey], state: val }
    }));
  };

  const handleSubmit = async () => {
    if (!rooms.kitchen.state || !rooms.living.state || !rooms.bath.state) {
        alert("Veuillez évaluer l'état de toutes les pièces.");
        return;
    }
    setLoading(true);
    try {
        // Envoi des données (Multipart form data pour les photos)
        const formData = new FormData();
        formData.append('leaseId', id as string);
        formData.append('type', 'ENTRY'); // ou EXIT selon le contexte
        formData.append('kitchenState', rooms.kitchen.state);
        formData.append('livingState', rooms.living.state);
        formData.append('bathState', rooms.bath.state);
        formData.append('comment', comment);
        
        if(rooms.kitchen.photo) formData.append('kitchenPhoto', rooms.kitchen.photo);
        if(rooms.living.photo) formData.append('livingPhoto', rooms.living.photo);
        if(rooms.bath.photo) formData.append('bathPhoto', rooms.bath.photo);

        await api.post('/inventory', formData);
        
        alert("État des lieux enregistré avec succès !");
        router.push('/dashboard');
        router.push(`/dashboard/rehousing/${id}`);
    } catch (e) {
        alert("Erreur lors de l'envoi.");
    } finally {
        setLoading(false);
    }
  };

  if (!lease) return <div className="h-screen bg-[#0B1120] flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white pb-24 font-sans">
      
      {/* HEADER MOBILE */}
      <header className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-slate-400 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Annuler
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest text-[#F59E0B]">État des Lieux</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-8">
        
        {/* INFO BIEN */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                <Home className="w-3 h-3" /> Bien & Locataire
            </p>
            <p className="font-bold text-white text-lg">{lease.property.title}</p>
            <p className="text-xs text-slate-400">Locataire : {lease.tenant.name}</p>
        </div>

        {/* --- CUISINE --- */}
        <section className="space-y-3">
            <div className="flex items-center gap-3 text-blue-400">
                <span className="bg-blue-900/30 p-2 rounded-lg"><Utensils className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Cuisine</h2>
            </div>
            
            <div className="grid gap-3">
                <Select onValueChange={(v) => handleState('kitchen', v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white h-12 rounded-xl">
                        <SelectValue placeholder="État de la pièce..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NEUF">✨ État Neuf</SelectItem>
                        <SelectItem value="BON">✅ Bon état</SelectItem>
                        <SelectItem value="MOYEN">⚠️ État d'usage</SelectItem>
                        <SelectItem value="DEGRADE">❌ Dégradé</SelectItem>
                    </SelectContent>
                </Select>

                <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition cursor-pointer overflow-hidden h-32 ${rooms.kitchen.preview ? 'border-green-500 bg-green-900/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    {rooms.kitchen.preview ? (
                        <img src={rooms.kitchen.preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : null}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto('kitchen', e)} />
                    <div className="relative z-10 flex flex-col items-center">
                        {rooms.kitchen.preview ? <CheckCircle className="w-8 h-8 text-green-500 mb-1" /> : <Camera className="w-8 h-8 text-slate-400 mb-1" />}
                        <span className="text-xs font-bold text-slate-300">{rooms.kitchen.preview ? 'Photo prise' : 'Prendre une photo'}</span>
                    </div>
                </label>
            </div>
        </section>

        {/* --- SALON --- */}
        <section className="space-y-3">
            <div className="flex items-center gap-3 text-orange-400">
                <span className="bg-orange-900/30 p-2 rounded-lg"><Armchair className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Salon / Séjour</h2>
            </div>
            
            <div className="grid gap-3">
                <Select onValueChange={(v) => handleState('living', v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white h-12 rounded-xl">
                        <SelectValue placeholder="État de la pièce..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NEUF">✨ État Neuf</SelectItem>
                        <SelectItem value="BON">✅ Bon état</SelectItem>
                        <SelectItem value="MOYEN">⚠️ État d'usage</SelectItem>
                        <SelectItem value="DEGRADE">❌ Dégradé</SelectItem>
                    </SelectContent>
                </Select>

                <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition cursor-pointer overflow-hidden h-32 ${rooms.living.preview ? 'border-green-500 bg-green-900/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    {rooms.living.preview && <img src={rooms.living.preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto('living', e)} />
                    <div className="relative z-10 flex flex-col items-center">
                        {rooms.living.preview ? <CheckCircle className="w-8 h-8 text-green-500" /> : <Camera className="w-8 h-8 text-slate-400" />}
                        <span className="text-xs font-bold text-slate-300 mt-1">{rooms.living.preview ? 'Photo prise' : 'Prendre une photo'}</span>
                    </div>
                </label>
            </div>
        </section>

        {/* --- SDB --- */}
        <section className="space-y-3">
            <div className="flex items-center gap-3 text-teal-400">
                <span className="bg-teal-900/30 p-2 rounded-lg"><Bath className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Salle de Bain</h2>
            </div>
            
            <div className="grid gap-3">
                <Select onValueChange={(v) => handleState('bath', v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white h-12 rounded-xl">
                        <SelectValue placeholder="État de la pièce..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NEUF">✨ État Neuf</SelectItem>
                        <SelectItem value="BON">✅ Bon état</SelectItem>
                        <SelectItem value="MOYEN">⚠️ État d'usage</SelectItem>
                        <SelectItem value="DEGRADE">❌ Dégradé</SelectItem>
                    </SelectContent>
                </Select>

                <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition cursor-pointer overflow-hidden h-32 ${rooms.bath.preview ? 'border-green-500 bg-green-900/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    {rooms.bath.preview && <img src={rooms.bath.preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto('bath', e)} />
                    <div className="relative z-10 flex flex-col items-center">
                        {rooms.bath.preview ? <CheckCircle className="w-8 h-8 text-green-500" /> : <Camera className="w-8 h-8 text-slate-400" />}
                        <span className="text-xs font-bold text-slate-300 mt-1">{rooms.bath.preview ? 'Photo prise' : 'Prendre une photo'}</span>
                    </div>
                </label>
            </div>
        </section>

        {/* COMMENTAIRE */}
        <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-500 uppercase">Commentaire Général</h2>
            <Textarea 
                placeholder="Dégâts, observations..." 
                className="bg-slate-900 border-slate-800 text-white min-h-[100px] rounded-xl focus:border-[#F59E0B]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
        </section>

        {/* BOUTON VALIDATION */}
        <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full h-14 bg-[#F59E0B] hover:bg-orange-500 text-black font-black text-lg rounded-2xl shadow-lg shadow-orange-500/20"
        >
            {loading ? 'Envoi en cours...' : "🚀 VALIDER L'ÉTAT DES LIEUX"}
        </Button>

      </main>
    </div>
  );
}
