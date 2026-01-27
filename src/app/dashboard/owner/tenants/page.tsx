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

// ✅ TYPAGE STRICT
interface Property {
    id: string;
    title: string;
    commune: string;
    price: number;
}

export default function AddTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

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

  // 1. CHARGER LES BIENS (ZERO TRUST)
  useEffect(() => {
    const fetchProperties = async () => {
        try {
            // ✅ APPEL SÉCURISÉ : Auth automatique via Cookie
            const res = await api.get('/owner/properties');
            
            if (res.data.success) {
                setProperties(res.data.properties);
            }
        } catch (e: any) { 
            console.error(e); 
            // Redirection si session expirée
            if (e.response?.status === 401) {
                router.push('/login');
            }
        } finally { 
            setLoading(false); 
        }
    };
    fetchProperties();
  }, [router]);

  // 2. SOUMETTRE LE FORMULAIRE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
        // ✅ POST SÉCURISÉ (Pas de headers manuels)
        const res = await api.post('/owner/leases', formData);

        if (res.data.success) {
            // Si le backend a généré des credentials (nouveau user)
            if (res.data.credentials) {
                await Swal.fire({
                    title: 'Locataire Créé ! 🎉',
                    html: `
                        <div class="text-left bg-slate-800 p-6 rounded-xl border border-slate-700 text-white shadow-inner">
                            <p class="mb-4 text-slate-300">Un compte a été généré automatiquement :</p>
                            <div class="space-y-2 font-mono">
                                <p>📧 Email : <strong class="text-white">${res.data.credentials.email}</strong></p>
                                <p>🔑 Passe : <strong class="text-[#F59E0B] select-all bg-black/30 px-2 py-1 rounded">${res.data.credentials.password}</strong></p>
                            </div>
                            <p class="text-xs text-slate-500 mt-4 italic">⚠️ Notez ces identifiants ou transmettez-les maintenant.</p>
                        </div>
                    `,
                    icon: 'success',
                    background: '#0f172a', color: '#fff',
                    confirmButtonText: 'Terminer',
                    confirmButtonColor: '#F59E0B'
                });
            } else {
                toast.success("Le locataire a été ajouté et le bail créé.");
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
    <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 text-white pb-20">
      
      {/* HEADER */}
      <div className="max-w-3xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-500">
        <Link href="/dashboard/owner/tenants" className="flex items-center text-slate-400 hover:text-white gap-2 transition w-fit mb-4">
            <ArrowLeft className="w-4 h-4" /> Annuler
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <User className="text-[#F59E0B] w-8 h-8" /> Enregistrer un Locataire
        </h1>
        <p className="text-slate-500 text-sm mt-1">Créez un bail numérique et invitez votre locataire sur la plateforme.</p>
      </div>

      {/* FORMULAIRE */}
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION 1 : LE BIEN */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Home className="w-5 h-5 text-blue-500"/> Sélection du Bien
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <Label className="text-slate-400 font-bold uppercase text-xs">Propriété concernée</Label>
                    <div className="relative">
                        <select 
                            required
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none font-medium transition-colors cursor-pointer"
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
                         {/* Chevron custom */}
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                    </div>
                </div>
            </div>

            {/* SECTION 2 : LE LOCATAIRE */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
                    <User className="w-5 h-5 text-[#F59E0B]"/> Informations Locataire
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Nom Complet</Label>
                        <Input 
                            required placeholder="Ex: Jean Kouassi" 
                            className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl focus:border-[#F59E0B]"
                            value={formData.tenantName}
                            onChange={e => setFormData({...formData, tenantName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Téléphone</Label>
                        <Input 
                            required placeholder="07 00 00 00 00" 
                            className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl focus:border-[#F59E0B]"
                            value={formData.tenantPhone}
                            onChange={e => setFormData({...formData, tenantPhone: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Email (Identifiant de connexion)</Label>
                        <Input 
                            required type="email" placeholder="jean@email.com" 
                            className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl focus:border-[#F59E0B]"
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
                        <Label className="text-slate-400 font-bold uppercase text-xs">Loyer Mensuel (FCFA)</Label>
                        <Input 
                            required type="number" 
                            className="bg-slate-950 border-slate-700 text-emerald-400 font-black h-12 rounded-xl focus:border-[#F59E0B]"
                            value={formData.rent}
                            onChange={e => setFormData({...formData, rent: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Caution / Avance</Label>
                        <Input 
                            required type="number" 
                            className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl focus:border-[#F59E0B]"
                            value={formData.deposit}
                            onChange={e => setFormData({...formData, deposit: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-400 font-bold uppercase text-xs">Date d'entrée</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-500"/>
                            <Input 
                                required type="date" 
                                className="pl-10 bg-slate-950 border-slate-700 text-white h-12 rounded-xl focus:border-[#F59E0B]"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SUBMIT */}
            <div className="pt-6 border-t border-slate-800 flex justify-end">
                <Button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-[#F59E0B] hover:bg-yellow-500 text-black font-black py-6 px-8 text-lg rounded-xl shadow-lg shadow-yellow-500/20 w-full md:w-auto transition hover:scale-105 active:scale-95"
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
