"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Camera, CheckCircle, ArrowLeft, Home, Utensils, Armchair, Bath } from "lucide-react";

// On retire les composants UI shadcn/ui si vous ne les avez pas installés
// On remplace par du HTML standard stylisé Tailwind pour aller vite

export default function InventoryPerformPage() {
  const { id } = useParams(); // Ici 'id' sera l'ID DU BAIL
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [lease, setLease] = useState<any>(null);
  const [type, setType] = useState('ENTREE'); // Par défaut
  
  // État du formulaire
  const [rooms, setRooms] = useState({
    kitchen: { state: "BON", photo: null as File | null, preview: "" },
    living: { state: "BON", photo: null as File | null, preview: "" },
    bath: { state: "BON", photo: null as File | null, preview: "" },
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    // Récupérer les infos du bail pour afficher l'adresse
    const fetchLease = async () => {
        try {
            // On utilise la route qu'on a créée tout à l'heure pour le contrat
            const { data } = await api.get(`/owner/leases/${id}`);
            setLease(data.lease); // Attention à la structure de réponse
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
    setLoading(true);
    try {
        const formData = new FormData();
        formData.append('leaseId', id as string);
        formData.append('type', type);
        
        formData.append('kitchenState', rooms.kitchen.state);
        formData.append('livingState', rooms.living.state);
        formData.append('bathState', rooms.bath.state);
        formData.append('comment', comment);
        
        if(rooms.kitchen.photo) formData.append('kitchenPhoto', rooms.kitchen.photo);
        if(rooms.living.photo) formData.append('livingPhoto', rooms.living.photo);
        if(rooms.bath.photo) formData.append('bathPhoto', rooms.bath.photo);

        await api.post('/owner/inventory', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        alert("État des lieux enregistré avec succès !");
        router.push('/dashboard/owner/inventory'); // Retour à la liste
    } catch (e) {
        console.error(e);
        alert("Erreur lors de l'envoi.");
    } finally {
        setLoading(false);
    }
  };

  if (!lease) return <div className="h-screen bg-[#0B1120] flex items-center justify-center text-white"><Loader2 className="animate-spin text-[#F59E0B]"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white pb-24 font-sans">
      
      {/* HEADER MOBILE */}
      <header className="sticky top-0 z-20 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-slate-400 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Annuler
        </button>
        <h1 className="text-sm font-bold uppercase tracking-widest text-[#F59E0B]">État des Lieux</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        
        {/* INFO BIEN */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                <Home className="w-3 h-3" /> Bien & Locataire
            </p>
            <p className="font-bold text-white text-lg">{lease.property.title}</p>
            <p className="text-xs text-slate-400">Locataire : {lease.tenant.name}</p>
            
            {/* Switch Type */}
            <div className="flex bg-black rounded-lg p-1 mt-4 border border-slate-700">
                <button onClick={() => setType('ENTREE')} className={`flex-1 py-1 rounded text-xs font-bold transition ${type === 'ENTREE' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>ENTRÉE</button>
                <button onClick={() => setType('SORTIE')} className={`flex-1 py-1 rounded text-xs font-bold transition ${type === 'SORTIE' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>SORTIE</button>
            </div>
        </div>

        {/* --- CUISINE --- */}
        <section className="space-y-3">
            <div className="flex items-center gap-3 text-blue-400">
                <span className="bg-blue-900/20 p-2 rounded-lg"><Utensils className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Cuisine</h2>
            </div>
            
            <div className="grid gap-3">
                <select 
                    className="bg-slate-900 border border-slate-800 text-white h-12 rounded-xl px-4 w-full outline-none focus:border-blue-500"
                    onChange={(e) => handleState('kitchen', e.target.value)}
                    value={rooms.kitchen.state}
                >
                    <option value="NEUF">✨ État Neuf</option>
                    <option value="BON">✅ Bon état</option>
                    <option value="MOYEN">⚠️ État d'usage</option>
                    <option value="DEGRADE">❌ Dégradé</option>
                </select>

                <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition cursor-pointer overflow-hidden h-32 ${rooms.kitchen.preview ? 'border-green-500 bg-green-900/10' : 'border-slate-700 bg-slate-900/50'}`}>
                    {rooms.kitchen.preview && <img src={rooms.kitchen.preview} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
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
                <span className="bg-orange-900/20 p-2 rounded-lg"><Armchair className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Salon / Séjour</h2>
            </div>
            <div className="grid gap-3">
                <select 
                    className="bg-slate-900 border border-slate-800 text-white h-12 rounded-xl px-4 w-full outline-none focus:border-orange-500"
                    onChange={(e) => handleState('living', e.target.value)}
                    value={rooms.living.state}
                >
                    <option value="NEUF">✨ État Neuf</option>
                    <option value="BON">✅ Bon état</option>
                    <option value="MOYEN">⚠️ État d'usage</option>
                    <option value="DEGRADE">❌ Dégradé</option>
                </select>
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
                <span className="bg-teal-900/20 p-2 rounded-lg"><Bath className="w-5 h-5" /></span>
                <h2 className="text-lg font-bold text-white">Salle de Bain</h2>
            </div>
            <div className="grid gap-3">
                <select 
                    className="bg-slate-900 border border-slate-800 text-white h-12 rounded-xl px-4 w-full outline-none focus:border-teal-500"
                    onChange={(e) => handleState('bath', e.target.value)}
                    value={rooms.bath.state}
                >
                    <option value="NEUF">✨ État Neuf</option>
                    <option value="BON">✅ Bon état</option>
                    <option value="MOYEN">⚠️ État d'usage</option>
                    <option value="DEGRADE">❌ Dégradé</option>
                </select>
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
            <textarea 
                placeholder="Dégâts, observations..." 
                className="w-full bg-slate-900 border border-slate-800 text-white min-h-[100px] rounded-xl p-4 focus:border-[#F59E0B] outline-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
        </section>

        {/* BOUTON VALIDATION */}
        <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full h-14 bg-[#F59E0B] hover:bg-yellow-400 text-black font-black text-lg rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2"
        >
            {loading ? <Loader2 className="animate-spin"/> : "🚀 VALIDER L'ÉTAT DES LIEUX"}
        </button>

      </main>
    </div>
  );
}
