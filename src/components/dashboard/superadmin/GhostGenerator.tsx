"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Loader2, FileText, Send, Plus, Trash2, BedDouble, Bath, Building2 } from "lucide-react";
import { api } from "@/lib/api";

export default function GhostGenerator() {
  const [ghostData, setGhostData] = useState({ 
      title: '', 
      price: '', 
      commune: '', 
      type: 'APPARTEMENT',
      bedrooms: 1,
      bathrooms: 1,
      description: '',
      fbLink: '',
      images: [''] // Tableau pour gérer plusieurs images
  });
  
  const [isSubmittingGhost, setIsSubmittingGhost] = useState(false);

  // Gestion des champs d'images dynamiques
  const handleImageChange = (index: number, value: string) => {
      const newImages = [...ghostData.images];
      newImages[index] = value;
      setGhostData({ ...ghostData, images: newImages });
  };

  const addImageField = () => setGhostData({ ...ghostData, images: [...ghostData.images, ''] });
  
  const removeImageField = (index: number) => {
      const newImages = ghostData.images.filter((_, i) => i !== index);
      setGhostData({ ...ghostData, images: newImages });
  };

  const handleCreateGhost = async () => {
    if (!ghostData.title || !ghostData.price || !ghostData.commune) {
        return Swal.fire({ icon: 'error', title: 'Erreur', text: "Titre, Prix et Commune sont obligatoires.", background: '#0F172A', color: '#fff' });
    }

    setIsSubmittingGhost(true);
    try {
        // On nettoie les liens d'images vides avant l'envoi
        const cleanedData = {
            ...ghostData,
            price: Number(ghostData.price),
            bedrooms: Number(ghostData.bedrooms),
            bathrooms: Number(ghostData.bathrooms),
            images: ghostData.images.filter(img => img.trim() !== '')
        };

        const res = await api.post<{ propertyId: string }>('/superadmin/ghost-property', cleanedData);
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const generatedLink = `${baseUrl}/properties/${res.data.propertyId}?ref=gh`;

        Swal.fire({
            title: '🔥 Arme chargée !',
            html: `
                <p class="text-sm text-slate-400 mb-4">L'annonce ultra-détaillée est en ligne. Voici le lien magique :</p>
                <div class="bg-black p-3 rounded-lg border border-orange-500 text-emerald-400 font-mono text-xs break-all select-all">
                    ${generatedLink}
                </div>
            `,
            icon: 'success',
            confirmButtonText: 'Copier le lien',
            confirmButtonColor: '#F59E0B',
            background: '#0F172A', color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                navigator.clipboard.writeText(generatedLink);
                Swal.fire({ icon: 'success', title: 'Copié !', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#0F172A', color: '#fff' });
            }
        });

        // Reset du formulaire
        setGhostData({ title: '', price: '', commune: '', type: 'APPARTEMENT', bedrooms: 1, bathrooms: 1, description: '', fbLink: '', images: [''] });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Oups', text: "Échec de la création.", background: '#0F172A', color: '#fff' });
    } finally {
        setIsSubmittingGhost(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-orange-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-5 h-5"/> Générateur Ghost Pro
            </h2>
            <span className="bg-orange-500 text-[#020617] px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                Acquisition FB
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
            {/* LIGNE 1 : Titre et Type */}
            <div className="md:col-span-8">
                <input 
                    type="text" placeholder="Titre (ex: Superbe Villa Duplex)" 
                    value={ghostData.title} onChange={e => setGhostData({...ghostData, title: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition" 
                />
            </div>
            <div className="md:col-span-4 relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <select 
                    value={ghostData.type} onChange={e => setGhostData({...ghostData, type: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-orange-500 transition appearance-none"
                >
                    <option value="APPARTEMENT">Appartement</option>
                    <option value="VILLA">Villa</option>
                    <option value="STUDIO">Studio</option>
                    <option value="MAGASIN">Magasin</option>
                    <option value="BUREAU">Bureau</option>
                </select>
            </div>

            {/* LIGNE 2 : Loyer, Commune, Chambres, Douches */}
            <div className="md:col-span-4">
                <input 
                    type="number" placeholder="Loyer (FCFA)" 
                    value={ghostData.price} onChange={e => setGhostData({...ghostData, price: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition" 
                />
            </div>
            <div className="md:col-span-4">
                <input 
                    type="text" placeholder="Commune (ex: Cocody)" 
                    value={ghostData.commune} onChange={e => setGhostData({...ghostData, commune: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition" 
                />
            </div>
            <div className="md:col-span-2 relative">
                <BedDouble className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                    type="number" min="1" placeholder="Ch." 
                    value={ghostData.bedrooms} onChange={e => setGhostData({...ghostData, bedrooms: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-orange-500 transition" 
                />
            </div>
            <div className="md:col-span-2 relative">
                <Bath className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                    type="number" min="1" placeholder="SdB" 
                    value={ghostData.bathrooms} onChange={e => setGhostData({...ghostData, bathrooms: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-orange-500 transition" 
                />
            </div>

            {/* LIGNE 3 : Description Facebook (Commodités) */}
            <div className="md:col-span-12">
                <textarea 
                    placeholder="Colle ici la description FB (Commodités : Clim, Ascenseur, Sous-sol...)" 
                    rows={4}
                    value={ghostData.description} onChange={e => setGhostData({...ghostData, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition resize-none" 
                />
            </div>

            {/* LIGNE 4 : Images Multiples */}
            <div className="md:col-span-12 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Liens des Photos (Séparés)</label>
                {ghostData.images.map((img, index) => (
                    <div key={index} className="flex gap-2">
                        <input 
                            type="text" placeholder={`Lien image ${index + 1}`} 
                            value={img} onChange={e => handleImageChange(index, e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition" 
                        />
                        {ghostData.images.length > 1 && (
                            <button onClick={() => removeImageField(index)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
                <button onClick={addImageField} className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1 mt-2 transition">
                    <Plus className="w-4 h-4" /> Ajouter une autre photo
                </button>
            </div>

            {/* LIGNE 5 : Lien Original FB */}
            <div className="md:col-span-12 mt-2">
                <input 
                    type="text" placeholder="Lien du post Facebook original (Pour tes archives)" 
                    value={ghostData.fbLink} onChange={e => setGhostData({...ghostData, fbLink: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 transition border-dashed" 
                />
            </div>
        </div>
        
        <button 
            onClick={handleCreateGhost} 
            disabled={isSubmittingGhost} 
            className="mt-6 w-full bg-orange-500 hover:bg-orange-400 text-[#020617] font-black px-8 py-4 rounded-xl transition uppercase tracking-wider shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 relative z-10"
        >
            {isSubmittingGhost ? <Loader2 className="animate-spin w-5 h-5"/> : <><Send className="w-5 h-5"/> Déployer l'annonce Pro</>}
        </button>
    </div>
  );
}
