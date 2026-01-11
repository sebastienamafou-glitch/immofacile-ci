'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Loader2, Camera, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewInventoryPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // États du formulaire
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [type, setType] = useState('ENTREE');
  const [formData, setFormData] = useState({
    kitchenState: 'BON', kitchenPhoto: null as File | null,
    livingState: 'BON', livingPhoto: null as File | null,
    bathState: 'BON', bathPhoto: null as File | null,
    comment: ''
  });

  // Charger les baux pour le menu déroulant
  useEffect(() => {
    const fetchLeases = async () => {
      try {
        console.log("🔍 Chargement des baux...");
        // 👇 On appelle bien la liste des baux (route que nous avons créée avant)
        const res = await api.get('/owner/leases');
        console.log("✅ Baux reçus:", res.data);
        
        setLeases(res.data.leases || []);
      } catch (e) {
        console.error("❌ Erreur chargement baux:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) return alert("Veuillez sélectionner un bail.");
    
    setSubmitting(true);
    
    const data = new FormData();
    data.append('leaseId', selectedLeaseId);
    data.append('type', type);
    data.append('kitchenState', formData.kitchenState);
    data.append('livingState', formData.livingState);
    data.append('bathState', formData.bathState);
    data.append('comment', formData.comment);
    
    if (formData.kitchenPhoto) data.append('kitchenPhoto', formData.kitchenPhoto);
    if (formData.livingPhoto) data.append('livingPhoto', formData.livingPhoto);
    if (formData.bathPhoto) data.append('bathPhoto', formData.bathPhoto);

    try {
      await api.post('/owner/inventory', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("État des lieux enregistré avec succès !");
      router.push('/dashboard/owner/inventory'); 
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#F59E0B]" />
        <p>Chargement du formulaire...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-white pb-20 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B1120]/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <Link href="/dashboard/owner/inventory" className="text-slate-400 text-sm flex items-center gap-1"><ArrowLeft size={16}/> Annuler</Link>
        <h1 className="text-sm font-bold uppercase tracking-widest text-[#F59E0B]">Nouvel État des Lieux</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SÉLECTION DU BAIL & TYPE */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Bail Concerné</label>
                    <select 
                        className="w-full bg-black border border-slate-700 rounded-xl p-3 text-sm focus:border-[#F59E0B] outline-none transition"
                        value={selectedLeaseId}
                        onChange={(e) => setSelectedLeaseId(e.target.value)}
                        required
                    >
                        <option value="">-- Choisir un contrat --</option>
                        {leases.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.property.title} ({l.tenant.name})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Type d'EDL</label>
                    <div className="flex bg-black rounded-xl p-1 border border-slate-700">
                        <button type="button" onClick={() => setType('ENTREE')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${type === 'ENTREE' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>ENTRÉE</button>
                        <button type="button" onClick={() => setType('SORTIE')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${type === 'SORTIE' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>SORTIE</button>
                    </div>
                </div>
            </div>

            {/* SECTIONS CUISINE / SALON / BAIN (Code identique mais sécurisé) */}
            {['Cuisine', 'Salon', 'Salle de Bain'].map((room, idx) => {
                const fieldState = idx === 0 ? 'kitchenState' : idx === 1 ? 'livingState' : 'bathState';
                const fieldPhoto = idx === 0 ? 'kitchenPhoto' : idx === 1 ? 'livingPhoto' : 'bathPhoto';
                // @ts-ignore
                const currentPhoto = formData[fieldPhoto];

                return (
                    <section key={room} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-white p-2 rounded-lg text-xl">
                                {idx === 0 ? '🍳' : idx === 1 ? '🛋️' : '🚿'}
                            </span>
                            <h2 className="text-lg font-bold">{room}</h2>
                        </div>
                        <div className="grid gap-3">
                            <select 
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm outline-none focus:border-[#F59E0B]"
                                // @ts-ignore
                                onChange={(e) => setFormData({...formData, [fieldState]: e.target.value})}
                            >
                                <option value="NEUF">État Neuf</option>
                                <option value="BON">Bon état</option>
                                <option value="MOYEN">État d'usage</option>
                                <option value="DEGRADE">Dégradé</option>
                            </select>
                            
                            <label className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition cursor-pointer group ${currentPhoto ? 'border-green-500 bg-green-500/10' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800'}`}>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, fieldPhoto)} />
                                {currentPhoto ? (
                                    <><CheckCircle className="w-8 h-8 text-green-500 mb-2"/><span className="text-xs font-bold text-green-400">Photo ajoutée</span></>
                                ) : (
                                    <><Camera className="w-8 h-8 text-slate-500 mb-2 group-hover:text-white transition"/><span className="text-xs font-bold text-slate-400 group-hover:text-white">Ajouter photo</span></>
                                )}
                            </label>
                        </div>
                    </section>
                )
            })}

            {/* COMMENTAIRE */}
            <section className="space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase">Commentaire global</h2>
                <textarea 
                    rows={4} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm outline-none focus:border-[#F59E0B]"
                    placeholder="Dégâts particuliers, observations..."
                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                ></textarea>
            </section>

            <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-[#F59E0B] hover:bg-yellow-400 text-[#0B1120] font-black py-5 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition flex justify-center items-center gap-2 mb-10"
            >
                {submitting ? <Loader2 className="animate-spin"/> : '🚀 VALIDER L\'ÉTAT DES LIEUX'}
            </button>

        </form>
      </main>
    </div>
  );
}
