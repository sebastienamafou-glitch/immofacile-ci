"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Building2, UserPlus, Calendar, Wallet, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { TenantCredentialsModal } from "@/components/TenantCredentialsModal";

// ✅ DTO STRICT : Aligné sur la réponse de /api/owner/properties
export interface AvailableProperty {
    id: string;
    title: string;
    price: number;
    isAvailable: boolean;
}

// --- COMPOSANT FORMULAIRE ISOLÉ POUR useSearchParams ---
function NewLeaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get("propertyId");

  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<AvailableProperty[]>([]);
  
  // Form States
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantName, setTenantName] = useState(""); 
  const [tenantPhone, setTenantPhone] = useState(""); 
  const [rent, setRent] = useState("");
  const [startDate, setStartDate] = useState("");

  // Nouveaux States pour respecter la Loi n° 2019-576
  const [depositMonths, setDepositMonths] = useState("2");
  const [advanceMonths, setAdvanceMonths] = useState("2");

  // Modal States
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ name: "", phone: "", password: "" });

  useEffect(() => {
    const loadProperties = async () => {
        try {
            const res = await api.get('/owner/properties');
            if (res.data.success) {
                // Filtrage sécurisé basé sur le DTO
                const availableProps = res.data.properties.filter((p: AvailableProperty) => p.isAvailable);
                setProperties(availableProps);

                // Auto-sélection si on vient d'une page détail
                if (preselectedPropertyId) {
                    const matchedProperty = availableProps.find((p: AvailableProperty) => p.id === preselectedPropertyId);
                    if (matchedProperty) {
                        setSelectedPropertyId(matchedProperty.id);
                        setRent(matchedProperty.price.toString());
                    }
                }
            }
        } catch (e) { 
            console.error(e); 
            toast.error("Impossible de charger vos biens.");
        }
    };
    loadProperties();
  }, [preselectedPropertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numRent = Number(rent);
    const numDepositMonths = Number(depositMonths);
    const numAdvanceMonths = Number(advanceMonths);
    
    // 🛑 VÉRIFICATION JURIDIQUE : LOI N° 2019-576 🛑
    if (numDepositMonths > 2 || numAdvanceMonths > 2) {
        toast.error(
            "Limites légales dépassées", 
            { description: "La loi limite la caution à 2 mois et l'avance à 2 mois maximum." }
        );
        return; 
    }

    setLoading(true);

    try {
        const totalDeposit = numRent * numDepositMonths;
        const totalAdvance = numRent * numAdvanceMonths;

        const res = await api.post('/owner/leases', {
            propertyId: selectedPropertyId,
            tenantEmail,
            tenantName,
            tenantPhone,
            rent: numRent,
            depositAmount: totalDeposit,
            advanceAmount: totalAdvance,
            startDate
        });

        if (res.data.success) {
            toast.success("Bail créé avec succès !");
            
            if (res.data.credentials) {
                setNewCredentials({
                    name: tenantName || "Locataire",
                    phone: tenantEmail, 
                    password: res.data.credentials.password
                });
                setShowCredentials(true);
            } else {
                router.push(`/dashboard/owner/leases/${res.data.lease.id}`);
            }
        }
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        toast.error(axiosError.response?.data?.error || "Erreur lors de la création du bail.");
    } finally {
        setLoading(false);
    }
  };

  const handleCloseModal = () => {
      setShowCredentials(false);
      router.push('/dashboard/owner/leases');
  };

  // Calculs dynamiques pour l'affichage
  const currentRent = Number(rent) || 0;
  const calculatedDeposit = currentRent * Number(depositMonths);
  const calculatedAdvance = currentRent * Number(advanceMonths);
  const totalToPay = calculatedDeposit + calculatedAdvance;

  return (
    <>
        <div className="max-w-3xl w-full space-y-6">
            <Link href="/dashboard/owner/leases" className="inline-flex items-center text-slate-400 hover:text-white gap-2 transition text-sm">
                <ArrowLeft className="w-4 h-4" /> Annuler et retour
            </Link>

            <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>
                <CardHeader>
                    <CardTitle className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                        <Building2 className="text-[#F59E0B] w-6 h-6" /> Nouveau Contrat de Bail
                    </CardTitle>
                    <p className="text-slate-400 text-sm">
                        Liez un bien à un locataire. Le contrat respectera automatiquement la Loi n° 2019-576.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* 1. SÉLECTION DU BIEN */}
                        <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Building2 className="w-4 h-4 text-slate-500"/> Le Bien Immobilier
                            </h3>
                            <div className="space-y-2">
                                <Label className="text-slate-300 text-xs uppercase font-bold">Sélectionner une propriété disponible <span className="text-red-500">*</span></Label>
                                {/* ✅ CORRECTION : Les balises <option> sont désormais à l'intérieur du <select> */}
                                <div className="relative">
                                    <select 
                                        required
                                        className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none font-medium"
                                        value={selectedPropertyId}
                                        onChange={(e) => {
                                            setSelectedPropertyId(e.target.value);
                                            const p = properties.find(prop => prop.id === e.target.value);
                                            if(p) setRent(p.price.toString());
                                        }}
                                    >
                                        <option value="">-- Choisir parmi vos biens vacants --</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.title} — {p.price.toLocaleString()} FCFA
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-3.5 text-slate-500 pointer-events-none">▼</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. LE LOCATAIRE */}
                        <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 space-y-4">
                            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                <UserPlus className="w-4 h-4 text-slate-500"/> Le Locataire
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Email <span className="text-red-500">*</span></Label>
                                    <Input 
                                        type="email" 
                                        required 
                                        placeholder="locataire@email.com"
                                        className="bg-[#0B1120] border-slate-700 text-white focus:border-[#F59E0B]"
                                        value={tenantEmail}
                                        onChange={(e) => setTenantEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Nom Complet</Label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ex: Jean Kouassi"
                                        className="bg-[#0B1120] border-slate-700 text-white focus:border-[#F59E0B]"
                                        value={tenantName}
                                        onChange={(e) => setTenantName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. TERMES DU CONTRAT */}
                        <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 space-y-4">
                             <div className="flex justify-between items-center">
                                 <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Wallet className="w-4 h-4 text-slate-500"/> Conditions Financières
                                </h3>
                                <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
                                    <Info className="w-3 h-3"/> Conforme Loi 2019-576
                                </div>
                             </div>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Loyer Mensuel <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            required 
                                            min="0"
                                            className="bg-[#0B1120] border-slate-700 text-emerald-400 font-bold pl-8 text-lg"
                                            value={rent}
                                            onChange={(e) => setRent(e.target.value)}
                                        />
                                        <span className="absolute left-3 top-3 text-slate-500 font-bold">F</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Date d'entrée <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input 
                                            type="date" 
                                            required
                                            className="bg-[#0B1120] border-slate-700 text-white pl-10 text-lg"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 bg-[#0B1120] p-4 rounded-lg border border-slate-800">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Dépôt de garantie (Mois)</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none"
                                            value={depositMonths}
                                            onChange={(e) => setDepositMonths(e.target.value)}
                                        >
                                            <option value="0">Aucune caution (0 mois)</option>
                                            <option value="1">1 mois ({currentRent.toLocaleString()} F)</option>
                                            <option value="2">2 mois ({(currentRent * 2).toLocaleString()} F) - Max légal</option>
                                        </select>
                                        <div className="absolute right-4 top-4 text-slate-500 pointer-events-none">▼</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Avance sur loyer (Mois)</Label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none"
                                            value={advanceMonths}
                                            onChange={(e) => setAdvanceMonths(e.target.value)}
                                        >
                                            <option value="0">Aucune avance (0 mois)</option>
                                            <option value="1">1 mois ({currentRent.toLocaleString()} F)</option>
                                            <option value="2">2 mois ({(currentRent * 2).toLocaleString()} F) - Max légal</option>
                                        </select>
                                        <div className="absolute right-4 top-4 text-slate-500 pointer-events-none">▼</div>
                                    </div>
                                </div>
                            </div>

                            {/* Récapitulatif Total */}
                            {currentRent > 0 && (
                                <div className="mt-4 flex justify-between items-center bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                    <span className="text-sm font-bold text-slate-300">Total à payer à la signature :</span>
                                    <span className="text-xl font-black text-white">{totalToPay.toLocaleString()} FCFA</span>
                                </div>
                            )}
                        </div>

                        <Button 
                            type="submit" 
                            disabled={loading || properties.length === 0}
                            className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-black font-black uppercase tracking-wide h-14 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Générer le contrat de bail"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        <TenantCredentialsModal 
            isOpen={showCredentials}
            onClose={handleCloseModal}
            tenantName={newCredentials.name}
            tenantPhone={newCredentials.phone} 
            tempPass={newCredentials.password}
        />
    </>
  );
}

// --- PAGE PRINCIPALE AVEC SUSPENSE (Obligatoire pour useSearchParams) ---
export default function NewLeasePage() {
    return (
        <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 font-sans flex flex-col items-center justify-center">
            <Suspense fallback={<div className="flex flex-col items-center gap-4 mt-20 text-slate-500"><Loader2 className="animate-spin w-8 h-8 text-[#F59E0B]"/>Chargement du formulaire...</div>}>
                <NewLeaseForm />
            </Suspense>
        </div>
    );
}
