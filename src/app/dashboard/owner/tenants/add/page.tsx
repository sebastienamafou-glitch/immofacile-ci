"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, Save, ArrowLeft, User, Wallet, Calendar, Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { toast } from "sonner"; // Optionnel, si vous préférez Sonner pour les petites erreurs

const MySwal = withReactContent(Swal);

// ✅ TYPAGE STRICT
interface Property {
  id: string;
  title: string;
  commune: string;
  price: number;
  isAvailable: boolean;
}

function AddTenantForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedPropertyId = searchParams.get("propertyId");

  const [loading, setLoading] = useState(false);
  const [fetchingProps, setFetchingProps] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);

  // État du formulaire
  const [formData, setFormData] = useState({
    propertyId: preSelectedPropertyId || "",
    tenantName: "",
    tenantPhone: "",
    monthlyRent: "",
    depositMonths: "2", // Par défaut : 2 mois (Légal)
    startDate: new Date().toISOString().split("T")[0],
  });

  // 1. CHARGEMENT DES BIENS
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // ✅ On utilise l'endpoint standardisé et sécurisé
        const res = await api.get("/owner/properties");
        if (res.data.success) {
          setProperties(res.data.properties);
          
          // Auto-remplissage du loyer si un bien est présélectionné
          if (preSelectedPropertyId) {
             const selected = res.data.properties.find((p: Property) => p.id === preSelectedPropertyId);
             if (selected) {
                 setFormData(prev => ({ ...prev, monthlyRent: selected.price.toString() }));
             }
          }
        }
      } catch (error) {
        console.error("Erreur chargement biens", error);
        toast.error("Impossible de charger la liste des biens.");
      } finally {
        setFetchingProps(false);
      }
    };
    fetchProperties();
  }, [preSelectedPropertyId]);

  // Handler générique
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si on change de propriété, on met à jour le loyer suggéré
    if (name === "propertyId") {
        const selectedProp = properties.find(p => p.id === value);
        if (selectedProp) {
            setFormData(prev => ({ ...prev, [name]: value, monthlyRent: selectedProp.price.toString() }));
            return;
        }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // SOUMISSION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation basique
      if(!formData.propertyId) throw new Error("Veuillez sélectionner un bien.");

      const res = await api.post("/owner/tenants", formData);

      if (res.data.success) {
        // SCÉNARIO A : NOUVEAU COMPTE CRÉÉ (Avec Credentials)
        if (res.data.credentials) {
            await MySwal.fire({
                title: 'Locataire Ajouté ! 🎉',
                html: `
                    <div class="text-left bg-slate-800 p-6 rounded-xl border border-slate-700 mt-4">
                        <p class="text-slate-400 text-sm mb-3 font-bold uppercase">Transmettre ces accès :</p>
                        <div class="space-y-2 font-mono text-sm">
                            <p class="text-white">📱 Login : <span class="text-yellow-400">${res.data.credentials.phone}</span></p>
                            <p class="text-white">🔑 Passe : <span class="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">${res.data.credentials.password}</span></p>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-4 italic flex items-center gap-1">
                            <ShieldCheck size={12}/> Ces infos ne s'affichent qu'une seule fois.
                        </p>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: "C'est noté, continuer",
                confirmButtonColor: '#F59E0B',
                background: '#0F172A',
                color: '#fff',
                allowOutsideClick: false
            });
        } 
        // SCÉNARIO B : LOCATAIRE DÉJÀ EXISTANT (Rattaché)
        else {
            await MySwal.fire({
                icon: "success",
                title: "Bail enregistré !",
                text: "Le locataire existant a été rattaché avec succès.",
                background: "#0F172A",
                color: "#fff",
                confirmButtonColor: "#F59E0B",
            });
        }

        router.push("/dashboard/owner/tenants");
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || "Erreur technique.";
      MySwal.fire({
        icon: "error",
        title: "Échec de création",
        text: msg,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#334155"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/owner/tenants" className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Nouveau Locataire</h1>
          <p className="text-slate-400 text-sm mt-1">Générez un bail numérique et créez l'accès locataire.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1E293B] p-6 lg:p-10 rounded-[2rem] border border-slate-700/50 shadow-2xl space-y-8">
        
        {/* SECTION 1 : Le Bien */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#F59E0B]" /> Bien à louer
                </label>
                <div className="relative">
                    <select 
                        name="propertyId"
                        value={formData.propertyId}
                        onChange={handleChange}
                        required
                        className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none appearance-none font-medium transition cursor-pointer"
                    >
                        <option value="">-- Sélectionner --</option>
                        {fetchingProps ? (
                            <option disabled>Chargement des biens...</option>
                        ) : (
                            properties.map((prop) => (
                                <option key={prop.id} value={prop.id}>
                                    {prop.title} - {prop.price.toLocaleString()} F {prop.isAvailable ? '' : '(Occupé)'}
                                </option>
                            ))
                        )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#F59E0B]" /> Loyer Mensuel (FCFA)
                </label>
                <input 
                    type="number" 
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder="Montant du loyer"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none font-mono font-bold"
                />
            </div>
        </div>

        <div className="h-px bg-slate-700/50"></div>

        {/* SECTION 2 : Infos Locataire */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-[#F59E0B]" /> Identité Locataire
                </label>
                <input 
                    type="text" 
                    name="tenantName"
                    value={formData.tenantName}
                    onChange={handleChange}
                    placeholder="Nom & Prénoms complets"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none font-medium"
                />
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    📞 Contact (Mobile)
                </label>
                <input 
                    type="tel" 
                    name="tenantPhone"
                    value={formData.tenantPhone}
                    onChange={handleChange}
                    placeholder="07 00 00 00 00"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none font-mono"
                />
            </div>
        </div>

        <div className="h-px bg-slate-700/50"></div>

        {/* SECTION 3 : Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    💰 Caution (Mois)
                </label>
                <div className="relative">
                    <select 
                        name="depositMonths"
                        value={formData.depositMonths}
                        onChange={handleChange}
                        className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none appearance-none font-bold"
                    >
                        <option value="1">1 Mois</option>
                        <option value="2">2 Mois (Max Légal)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                </div>
                
                <div className="flex gap-2 items-start mt-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 leading-tight">
                        Conformément à la réglementation 2019, la caution est plafonnée à 2 mois de loyer.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#F59E0B]" /> Date d'entrée
                </label>
                <input 
                    type="date" 
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-4 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none font-medium"
                />
            </div>
        </div>

        {/* ACTION */}
        <div className="pt-4">
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-[#0B1120] font-black py-5 rounded-xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? "Traitement en cours..." : "ENREGISTRER LE BAIL"}
            </button>
        </div>

      </form>
    </div>
  );
}

// Wrapper Suspense pour useSearchParams
export default function AddTenantPage() {
    return (
        <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 pb-20 font-sans">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                    <Loader2 className="animate-spin w-10 h-10 text-[#F59E0B]" />
                    <p className="text-slate-500 text-sm font-mono">Chargement du module locataire...</p>
                </div>
            }>
                <AddTenantForm />
            </Suspense>
        </div>
    );
}
