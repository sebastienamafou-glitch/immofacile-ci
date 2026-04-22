"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Loader2, ArrowLeft, Briefcase, Calendar, Wallet, Building2, Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgencyTenantsAction } from "../../actions"; 

export default function AgencyNewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Record<string, unknown>[]>([]);
  const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(""); 
  
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantName, setTenantName] = useState(""); 
  
  const [rent, setRent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [depositMonths, setDepositMonths] = useState("2");
  const [advanceMonths, setAdvanceMonths] = useState("2");

  useEffect(() => {
    const loadInitialData = async () => {
        try {
            const resProps = await api.get('/agency/properties');
            if (resProps.data.success) {
                setProperties(resProps.data.properties.filter((p: Record<string, unknown>) => p.isAvailable));
            }

            const tenantsRes = await getAgencyTenantsAction();
            if (tenantsRes.success && tenantsRes.tenants) {
                setTenants(tenantsRes.tenants);
            }
        } catch (e) { 
            console.error("Erreur de chargement", e);
        }
    };
    loadInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numDepositMonths = Number(depositMonths);
    const numAdvanceMonths = Number(advanceMonths);
    
    if (numDepositMonths > 2 || numAdvanceMonths > 2) {
        toast.error("Limites légales dépassées", { 
            description: "La loi limite la caution à 2 mois et l'avance à 2 mois maximum." 
        });
        return; 
    }

    if (!selectedTenantId && !tenantEmail) {
        toast.error("Locataire manquant", { description: "Veuillez sélectionner ou créer un locataire." });
        return;
    }

    setLoading(true);

    try {
        const payload = {
            propertyId: selectedPropertyId,
            rent: Number(rent),
            deposit: Number(rent) * Number(depositMonths),
            advance: Number(rent) * Number(advanceMonths),
            startDate,
            ...(selectedTenantId && !isManualEntry 
                ? { tenantId: selectedTenantId } 
                : { tenantEmail, tenantName })
        };

        const res = await api.post('/api/agency/leases', payload);

        if (res.data.success) {
            toast.success("Contrat généré avec succès.");
            router.push(`/dashboard/agency/leases/${res.data.lease.id}`);
        }
    } catch (error: unknown) {
        let errorMessage = "Erreur de création.";
        if (typeof error === 'object' && error !== null && 'response' in error) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            errorMessage = axiosError.response?.data?.error || errorMessage;
        }
        toast.error(errorMessage);
    } finally {
        setLoading(false);
    }
  };

  const currentRent = Number(rent) || 0;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
            <Link href="/dashboard/agency/contracts" className="inline-flex items-center text-slate-400 hover:text-white gap-2 transition text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Annuler et retourner à la liste
            </Link>

            <Card className="bg-slate-900/40 border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
                <CardHeader className="pb-8">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                            <Briefcase className="text-purple-500 w-8 h-8" />
                            Nouveau Mandat de Location
                        </CardTitle>
                    </div>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-l-4 border-purple-500 pl-4">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Sélection du patrimoine</h3>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Bien vacant sous gestion <span className="text-purple-500">*</span></Label>
                                <select 
                                    required
                                    className="w-full bg-[#0B1120] border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition appearance-none cursor-pointer"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setSelectedPropertyId(e.target.value);
                                        const p = properties.find(prop => (prop as any).id === e.target.value);
                                        if(p) setRent(String((p as any).price));
                                    }}
                                >
                                    <option value="" className="text-slate-500">-- Choisir un bien dans votre inventaire --</option>
                                    {properties.map((p: any) => (
                                        <option key={p.id} value={p.id} className="bg-[#0B1120]">
                                            {p.title} — {p.price.toLocaleString()} FCFA / mois
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-l-4 border-purple-500 pl-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-slate-500" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Dossier Locataire</h3>
                                </div>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                    onClick={() => setIsManualEntry(!isManualEntry)}
                                >
                                    {isManualEntry ? "Sélectionner dans le carnet" : "+ Saisie manuelle"}
                                </Button>
                            </div>

                            {!isManualEntry ? (
                                <div className="grid gap-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Locataire du carnet d'adresses <span className="text-purple-500">*</span></Label>
                                    <select 
                                        required={!isManualEntry}
                                        className="w-full bg-[#0B1120] border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition appearance-none cursor-pointer"
                                        value={selectedTenantId}
                                        onChange={(e) => setSelectedTenantId(e.target.value)}
                                    >
                                        <option value="" className="text-slate-500">-- Choisir un locataire importé --</option>
                                        {tenants.map((t: any) => (
                                            <option key={t.id} value={t.id} className="bg-[#0B1120]">
                                                {t.name} {t.phone ? `(${t.phone})` : ""} {t.email ? `[${t.email}]` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Email de connexion <span className="text-purple-500">*</span></Label>
                                        <Input 
                                            type="email" 
                                            required={isManualEntry}
                                            placeholder="locataire@email.com"
                                            className="bg-[#0B1120] border-slate-700 text-white h-14 rounded-xl focus:border-purple-500"
                                            value={tenantEmail} 
                                            onChange={(e) => setTenantEmail(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Nom complet du titulaire</Label>
                                        <Input 
                                            type="text" 
                                            placeholder="Ex: Kouamé Koffi"
                                            className="bg-[#0B1120] border-slate-700 text-white h-14 rounded-xl focus:border-purple-500"
                                            value={tenantName} 
                                            onChange={(e) => setTenantName(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-950/40 p-8 rounded-3xl border border-slate-800 space-y-8 relative overflow-hidden">
                            <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-4 relative z-10">
                                <Wallet className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Termes Financiers</h3>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Loyer Mensuel (FCFA)</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            value={rent} 
                                            onChange={(e) => setRent(e.target.value)} 
                                            className="bg-[#0B1120] border-slate-700 text-emerald-400 font-black h-14 pl-12 text-xl rounded-xl" 
                                        />
                                        <span className="absolute left-4 top-4 text-slate-600 font-bold">F</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Date de prise d'effet</Label>
                                    <div className="relative">
                                        <Input 
                                            type="date" required 
                                            className="bg-[#0B1120] border-slate-700 text-white h-14 pl-12 rounded-xl"
                                            value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                                        />
                                        <Calendar className="absolute left-4 top-4 w-5 h-5 text-slate-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 pt-4 relative z-10">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Caution <span>(2 mois max)</span></Label>
                                    <select className="w-full bg-[#0B1120] border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500" value={depositMonths} onChange={(e) => setDepositMonths(e.target.value)}>
                                        <option value="1">1 mois ({currentRent.toLocaleString()} F)</option>
                                        <option value="2">2 mois ({(currentRent * 2).toLocaleString()} F) — Max légal</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase flex justify-between">Avance <span>(2 mois max)</span></Label>
                                    <select className="w-full bg-[#0B1120] border-slate-700 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-purple-500" value={advanceMonths} onChange={(e) => setAdvanceMonths(e.target.value)}>
                                        <option value="1">1 mois ({currentRent.toLocaleString()} F)</option>
                                        <option value="2">2 mois ({(currentRent * 2).toLocaleString()} F) — Max légal</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-16 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-purple-900/20 transition-all text-lg">
                            {loading ? <Loader2 className="animate-spin" /> : "Générer le mandat certifié"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
