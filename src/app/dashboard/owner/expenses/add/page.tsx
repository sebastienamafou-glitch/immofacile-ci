"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, Receipt, Loader2, Home } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

export default function AddExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    propertyId: "",
    amount: "",
    category: "REPARATION",
    description: ""
  });

  // 1. Charger les biens pour le menu déroulant
  useEffect(() => {
    const fetchProps = async () => {
        const stored = localStorage.getItem("immouser");
        if (!stored) { router.push('/login'); return; }
        const user = JSON.parse(stored);

        try {
            // On utilise l'API légère dédiée aux formulaires
            const res = await api.get('/owner/tenant-form-data', {
                headers: { 'x-user-email': user.email }
            });
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (e) {
            console.error(e);
        }
    };
    fetchProps();
  }, [router]);

  // 2. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    setLoading(true);

    try {
      // Appel API Sécurisé
      const res = await api.post('/owner/expenses', {
        ...formData,
        amount: parseFloat(formData.amount)
      }, {
        headers: { 'x-user-email': user.email }
      });

      if (res.data.success) {
        await Swal.fire({ 
            title: "Dépense enregistrée", 
            icon: "success", 
            background: "#0F172A", 
            color: "#fff",
            confirmButtonColor: "#EF4444"
        });
        router.push('/dashboard/owner/expenses');
      }
    } catch (error) {
      toast.error("Impossible d'enregistrer la dépense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 text-white font-sans">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition font-bold text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
            <Receipt className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Nouvelle Dépense</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Bien concerné</label>
            <div className="relative">
                <Home className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                <select 
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-white outline-none focus:border-red-500 appearance-none transition"
                value={formData.propertyId}
                onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                >
                <option value="">-- Choisir un bien --</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Montant (F)</label>
              <input 
                type="number" required
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 font-bold font-mono"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Catégorie</label>
              <select 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 appearance-none"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="REPARATION">Réparation</option>
                <option value="TAXE">Impôts/Taxes</option>
                <option value="FACTURE">Facture</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Description</label>
            <textarea 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-red-500 h-24 text-sm"
              placeholder="Ex: Réparation fuite d'eau..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/20 transition flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ENREGISTRER LA DÉPENSE"}
          </button>
        </form>
      </div>
    </div>
  );
}
