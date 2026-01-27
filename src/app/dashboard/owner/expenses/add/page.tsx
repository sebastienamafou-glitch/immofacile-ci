"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Receipt, Loader2, Home, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

// ✅ TYPAGE STRICT
interface Property {
    id: string;
    title: string;
}

export default function AddExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    propertyId: "",
    amount: "",
    category: "REPARATION",
    description: ""
  });

  // 1. CHARGEMENT DES BIENS (ZERO TRUST)
  useEffect(() => {
    const fetchProps = async () => {
        try {
            // ✅ APPEL STANDARD SÉCURISÉ
            const res = await api.get('/owner/properties');
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (e: any) {
            console.error("Erreur chargement biens", e);
            if (e.response?.status === 401) {
                router.push('/login');
            } else {
                toast.error("Impossible de charger vos biens.");
            }
        } finally {
            setLoadingProps(false);
        }
    };
    fetchProps();
  }, [router]);

  // 2. SOUMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation basique
    if (parseFloat(formData.amount) <= 0) {
        toast.error("Le montant doit être positif.");
        setLoading(false);
        return;
    }

    try {
      // ✅ POST SÉCURISÉ (Pas de headers manuels)
      const res = await api.post('/owner/expenses', {
        ...formData,
        amount: parseFloat(formData.amount)
      });

      if (res.data.success) {
        await Swal.fire({ 
            title: "Dépense enregistrée", 
            text: "Le montant a été déduit de votre balance comptable.",
            icon: "success", 
            background: "#0F172A", 
            color: "#fff",
            confirmButtonColor: "#EF4444"
        });
        router.push('/dashboard/owner/expenses');
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || "Impossible d'enregistrer la dépense.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProps) return <div className="min-h-screen bg-[#0B1120] flex items-center justify-center"><Loader2 className="animate-spin text-red-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 text-white font-sans">
      
      {/* HEADER */}
      <div className="max-w-md mx-auto mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition font-bold text-sm group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Annuler
        </button>
      </div>

      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        
        {/* TITRE */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <Receipt className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Déclarer une Sortie</h1>
          <p className="text-slate-400 text-xs px-4">Ajoutez une dépense manuelle (travaux, taxes, factures) pour tenir votre comptabilité à jour.</p>
        </div>

        {properties.length === 0 ? (
            <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-2" />
                <p className="text-white font-bold">Aucun bien trouvé</p>
                <p className="text-slate-500 text-xs mb-4">Vous devez avoir au moins une propriété pour y attacher une dépense.</p>
                <button onClick={() => router.push('/dashboard/owner/properties/add')} className="text-red-500 font-bold text-xs hover:underline">Ajouter un bien</button>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* BIEN */}
            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Bien concerné</label>
                <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    <select 
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-white outline-none focus:border-red-500 appearance-none transition font-medium cursor-pointer"
                        value={formData.propertyId}
                        onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                    >
                        <option value="">-- Sélectionner un bien --</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs pointer-events-none">▼</div>
                </div>
            </div>

            {/* MONTANT & CATEGORIE */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Montant (F)</label>
                    <input 
                        type="number" required min="0" step="100"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 font-black font-mono placeholder:font-normal placeholder:text-slate-700"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Catégorie</label>
                    <div className="relative">
                        <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 appearance-none font-bold cursor-pointer"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            <option value="REPARATION">Réparation</option>
                            <option value="TAXE">Impôts</option>
                            <option value="FACTURE">Facture Eau/Elec</option>
                            <option value="AUTRE">Autre</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* DESCRIPTION */}
            <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Détails</label>
                <textarea 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 h-28 text-sm font-medium placeholder:text-slate-700 resize-none"
                placeholder="Ex: Remplacement serrure porte principale..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <button 
                type="submit" disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 transition flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "ENREGISTRER LA DÉPENSE"}
            </button>
            </form>
        )}
      </div>
    </div>
  );
}
