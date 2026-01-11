"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, ArrowLeft, Home, User, Wallet, Calendar, CheckCircle } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);

  // Form Data
  const [formData, setFormData] = useState({
    propertyId: "",
    tenantName: "",
    tenantPhone: "",
    tenantEmail: "",
    rent: "",
    deposit: "",
    startDate: ""
  });

  // 1. Charger les biens disponibles
  useEffect(() => {
    const fetchProperties = async () => {
        const stored = localStorage.getItem("immouser");
        if (!stored) return;
        const user = JSON.parse(stored);

        try {
            const res = await api.get('/owner/properties', {
                headers: { 'x-user-email': user.email }
            });
            if (res.data.success) {
                // On filtre pour ne garder que ceux qui sont "Disponibles" (sans missions de baux actifs)
                // Note : Pour l'instant on affiche tout pour simplifier, l'API bloquera si besoin ou on gère ça visuellement
                setProperties(res.data.properties);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchProperties();
  }, []);

  // 2. Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem("immouser");
    if (!stored) return;
    const user = JSON.parse(stored);

    setSubmitting(true);

    try {
        const res = await api.post('/owner/leases', formData, {
            headers: { 'x-user-email': user.email }
        });

        if (res.data.success) {
            // Succès
            let message = "Le locataire a été ajouté et le bail créé.";
            
            // Si nouvel utilisateur, on affiche les identifiants
            if (res.data.credentials) {
                await Swal.fire({
                    title: 'Locataire Créé ! 🎉',
                    html: `
                        <div class="text-left bg-slate-800 p-4 rounded-lg border border-slate-700 text-white">
                            <p class="mb-2">Un compte a été créé pour ce locataire.</p>
                            <p>📧 Email : <strong>${res.data.credentials.email}</strong></p>
                            <p>🔑 Passe : <strong class="text-orange-400 select-all">${res.data.credentials.password}</strong></p>
                            <p class="text-xs text-slate-400 mt-2">Transmettez ces accès, ils ne s'afficheront plus.</p>
                        </div>
                    `,
                    icon: 'success',
                    background: '#0f172a', color: '#fff',
                    confirmButtonColor: '#F59E0B'
                });
            } else {
                toast.success(message);
            }
            router.push('/dashboard/owner/tenants');
        }
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de la création.");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-[#F59E0B] w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 text-white">
      
      {/* HEADER */}
      <div className="max-w-3xl mx-auto mb-8">
        <Link href="/dashboard/owner/tenants" className="flex items-center text-slate-400 hover:text-white gap-2 transition w-fit mb-4">
            <ArrowLeft className="w-4 h-4" /> Annuler
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <User className="text-[#F59E0B]" /> Enregistrer un Locataire
        </h1>
        <p className="text-slate-500 text-sm mt-1">Créez un bail numérique et invitez votre locataire sur la plateforme.</p>
      </div>

      {/* FORMULAIRE */}
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1 : LE BIEN */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Home className="w-5 h-5 text-blue-500"/> Sélection du Bien
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <Label className="text-slate-400">Quel bien est concerné ?</Label>
                    <select 
                        required
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none"
                        value={formData.propertyId}
                        onChange={e => {
                            const prop = properties.find(p => p.id === e.target.value);
                            setFormData({
                                ...formData, 
                                propertyId: e.target.value,
                                rent: prop ? prop.price.toString() : "" // Auto-remplissage du loyer
                            });
                        }}
                    >
                        <option value="">-- Choisir un bien --</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title} ({p.commune}) - {p.price.toLocaleString()} F
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* SECTION 2 : LE LOCATAIRE */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                    <User className="w-5 h-5 text-[#F59E0B]"/> Informations Locataire
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-400">Nom Complet</Label>
                        <Input 
                            required placeholder="Ex: Jean Kouassi" 
                            className="bg-slate-950 border-slate-700 text-white"
                            value={formData.tenantName}
                            onChange={e => setFormData({...formData, tenantName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">Téléphone</Label>
                        <Input 
                            required placeholder="07 00 00 00 00" 
                            className="bg-slate-950 border-slate-700 text-white"
                            value={formData.tenantPhone}
                            onChange={e => setFormData({...formData, tenantPhone: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-400">Email (Sera son identifiant)</Label>
                        <Input 
                            required type="email" placeholder="jean@email.com" 
                            className="bg-slate-950 border-slate-700 text-white"
                            value={formData.tenantEmail}
                            onChange={e => setFormData({...formData, tenantEmail: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* SECTION 3 : LE CONTRAT */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Wallet className="w-5 h-5 text-emerald-500"/> Conditions Financières
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-400">Loyer Mensuel (FCFA)</Label>
                        <Input 
                            required type="number" 
                            className="bg-slate-950 border-slate-700 text-white font-bold text-emerald-400"
                            value={formData.rent}
                            onChange={e => setFormData({...formData, rent: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">Caution / Avance (FCFA)</Label>
                        <Input 
                            required type="number" 
                            className="bg-slate-950 border-slate-700 text-white"
                            value={formData.deposit}
                            onChange={e => setFormData({...formData, deposit: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400">Date d'entrée</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500"/>
                            <Input 
                                required type="date" 
                                className="pl-10 bg-slate-950 border-slate-700 text-white"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SUBMIT */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
                <Button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-[#F59E0B] hover:bg-yellow-500 text-black font-black py-6 px-8 text-lg rounded-xl shadow-lg shadow-yellow-500/20 w-full md:w-auto"
                >
                    {submitting ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2 w-5 h-5"/>}
                    VALIDER ET CRÉER LE BAIL
                </Button>
            </div>

        </form>
      </div>
    </div>
  );
}
