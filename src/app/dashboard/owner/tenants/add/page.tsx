"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
// ✅ AJOUT DE "ShieldCheck" DANS LES IMPORTS ICI :
import { Loader2, Save, ArrowLeft, User, Wallet, Calendar, Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

function AddTenantForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedPropertyId = searchParams.get("propertyId");

  const [loading, setLoading] = useState(false);
  const [fetchingProps, setFetchingProps] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);

  // État du formulaire
  const [formData, setFormData] = useState({
    propertyId: preSelectedPropertyId || "",
    tenantName: "",
    tenantPhone: "",
    monthlyRent: "",
    depositMonths: "2", // Par défaut : 2 mois de caution
    startDate: new Date().toISOString().split("T")[0], // Aujourd'hui par défaut
  });

  // 1. Charger la liste des biens pour le menu déroulant
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get("/owner/tenant-form-data");
        if (res.data.success) {
          setProperties(res.data.properties);
          
          // Si on a pré-sélectionné un bien, on met à jour le loyer automatiquement
          if (preSelectedPropertyId) {
             const selected = res.data.properties.find((p: any) => p.id === preSelectedPropertyId);
             if (selected) {
                 // On suppose que le bien a un prix par défaut (optionnel selon ton API)
                 // Sinon l'utilisateur le saisira
             }
          }
        }
      } catch (error) {
        console.error("Erreur chargement biens", error);
      } finally {
        setFetchingProps(false);
      }
    };
    fetchProperties();
  }, [preSelectedPropertyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/owner/tenants", formData);

      if (res.data.success) {
        // 👇 CORRECTION : On vérifie si le backend nous a donné des identifiants
        if (res.data.credentials) {
            await MySwal.fire({
                title: 'Locataire Ajouté ! 🎉',
                html: `
                    <div class="text-left bg-slate-800 p-4 rounded-lg mt-2">
                        <p class="text-slate-400 text-sm mb-1">Voici les identifiants à transmettre au locataire :</p>
                        <p class="text-white">📱 Login : <strong>${res.data.credentials.phone}</strong></p>
                        <p class="text-white">🔑 Mot de passe : <strong class="text-orange-500 text-xl">${res.data.credentials.password}</strong></p>
                        <p class="text-xs text-slate-500 mt-2 italic">⚠️ Notez-le bien ou faites une capture d'écran, il ne sera plus affiché !</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: "C'est noté !",
                confirmButtonColor: '#F59E0B',
                background: '#0F172A',
                color: '#fff',
                allowOutsideClick: false // Oblige à cliquer sur le bouton
            });
        } else {
            // Cas où le locataire existait déjà (pas de nouveau mot de passe)
            await MySwal.fire({
                icon: "success",
                title: "Bail créé !",
                text: "Ce locataire existant a été associé au nouveau bail.",
                background: "#1E293B",
                color: "#fff",
                confirmButtonColor: "#F59E0B",
            });
        }

        router.push("/dashboard/owner/tenants"); // Redirection
      }
    } catch (error: any) {
      MySwal.fire({
        icon: "error",
        title: "Erreur",
        text: error.response?.data?.error || "Impossible de créer le locataire.",
        background: "#1E293B",
        color: "#fff",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/owner/tenants" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white">Nouveau Locataire</h1>
          <p className="text-slate-400 text-sm">Créez un profil locataire et générez le bail associé.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1E293B] p-6 lg:p-8 rounded-3xl border border-slate-700/50 shadow-xl space-y-6">
        
        {/* SECTION 1 : Le Bien & Le Loyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#F59E0B]" /> Bien à louer
                </label>
                <select 
                    name="propertyId"
                    value={formData.propertyId}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none"
                >
                    <option value="">-- Choisir un bien --</option>
                    {fetchingProps ? (
                        <option>Chargement...</option>
                    ) : (
                        properties.map((prop) => (
                            <option key={prop.id} value={prop.id}>
                                {prop.title} ({prop.commune}) {prop.isAvailable ? '✅' : '❌'}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#F59E0B]" /> Loyer Mensuel (FCFA)
                </label>
                <input 
                    type="number" 
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder="Ex: 150000"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
            </div>
        </div>

        {/* SECTION 2 : Infos Locataire */}
        <div className="pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#F59E0B]" /> Nom complet du locataire
                </label>
                <input 
                    type="text" 
                    name="tenantName"
                    value={formData.tenantName}
                    onChange={handleChange}
                    placeholder="Ex: Kouassi Jean"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    📞 Téléphone
                </label>
                <input 
                    type="tel" 
                    name="tenantPhone"
                    value={formData.tenantPhone}
                    onChange={handleChange}
                    placeholder="Ex: 0707070707"
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
            </div>
        </div>

        {/* SECTION 3 : Conditions du Bail */}
        <div className="pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    💰 Caution (Mois)
                </label>
                
                {/* --- DÉBUT MODIFICATION LÉGALE --- */}
                <select 
                    id="deposit" 
                    name="depositMonths"
                    value={formData.depositMonths}
                    onChange={handleChange}
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none appearance-none"
                >
                    <option value="1">1 Mois</option>
                    <option value="2">2 Mois (Maximum Légal)</option>
                    {/* On supprime les options 3 et 4 mois qui sont illégales */}
                </select>

                <div className="mt-2 flex items-start gap-2 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-300">
                        <span className="font-bold">Conformité Loi 2019 :</span> La caution est strictement limitée à 2 mois. 
                        Vous pouvez demander jusqu'à 2 mois de loyer d'avance en plus.
                    </p>
                </div>
                {/* --- FIN MODIFICATION LÉGALE --- */}

            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#F59E0B]" /> Date d'entrée
                </label>
                <input 
                    type="date" 
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#0F172A] border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-[#F59E0B] outline-none"
                />
            </div>
        </div>

        {/* BOUTON VALIDATION */}
        <div className="pt-6">
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#F59E0B] hover:bg-yellow-400 text-[#0B1120] font-bold py-4 rounded-xl transition shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? "Création en cours..." : "Enregistrer le Bail & Locataire"}
            </button>
        </div>

      </form>
    </div>
  );
}

// On enveloppe dans Suspense car on utilise useSearchParams
export default function AddTenantPage() {
    return (
        <div className="min-h-screen bg-[#0B1120] p-6 lg:p-10 pb-20">
            <Suspense fallback={<div className="text-white text-center mt-20">Chargement...</div>}>
                <AddTenantForm />
            </Suspense>
        </div>
    );
}
