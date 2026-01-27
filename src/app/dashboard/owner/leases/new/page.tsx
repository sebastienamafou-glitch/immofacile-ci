"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Building2, UserPlus, Calendar, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property } from "@prisma/client";

// On importe le composant que vous m'avez donné plus tôt
import { TenantCredentialsModal } from "@/components/TenantCredentialsModal";

export default function NewLeasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Form States
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantName, setTenantName] = useState(""); 
  const [tenantPhone, setTenantPhone] = useState(""); // Ajout utile
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [startDate, setStartDate] = useState("");

  // Modal States
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ name: "", phone: "", password: "" });

  // 1. Charger les propriétés DISPONIBLES
  useEffect(() => {
    const loadProperties = async () => {
        try {
            // ✅ ZERO TRUST : Pas de headers manuels
            const res = await api.get('/owner/properties');
            
            if (res.data.success) {
                // Filtrage côté client pour double sécurité (l'API le fait peut-être déjà)
                // On cast en 'any' car le type Prisma standard n'a pas 'isAvailable' (ajouté par l'API)
                const availableProps = res.data.properties.filter((p: any) => p.isAvailable);
                setProperties(availableProps);
            }
        } catch (e) { 
            console.error(e); 
            toast.error("Impossible de charger vos biens.");
        }
    };
    loadProperties();
  }, []);

  // 2. Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // ✅ ZERO TRUST : Authentification par Cookie uniquement
        const res = await api.post('/owner/leases', {
            propertyId: selectedPropertyId,
            tenantEmail,
            tenantName,
            tenantPhone,
            rent: Number(rent),
            deposit: Number(deposit),
            startDate
        });

        if (res.data.success) {
            toast.success("Bail créé avec succès !");
            
            // Si l'API nous renvoie des identifiants (Nouveau User), on ouvre la modale
            if (res.data.credentials) {
                setNewCredentials({
                    name: tenantName || "Locataire",
                    phone: tenantEmail, // L'identifiant de connexion (souvent email ou tel)
                    password: res.data.credentials.password
                });
                setShowCredentials(true);
            } else {
                // Sinon redirection classique
                router.push(`/dashboard/owner/leases/${res.data.lease.id}`);
            }
        }
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de la création du bail.");
    } finally {
        setLoading(false);
    }
  };

  const handleCloseModal = () => {
      setShowCredentials(false);
      router.push('/dashboard/owner/leases');
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-6 lg:p-10 font-sans flex flex-col items-center justify-center">
        
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
                        Liez un bien à un locataire. Si le locataire n'existe pas, un compte sécurisé sera créé.
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
                                <select 
                                    required
                                    className="w-full bg-[#0B1120] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-[#F59E0B] outline-none appearance-none font-medium"
                                    value={selectedPropertyId}
                                    onChange={(e) => {
                                        setSelectedPropertyId(e.target.value);
                                        // Auto-fill loyer
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
                                {properties.length === 0 && (
                                    <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                                        ⚠️ Aucun bien vacant. Ajoutez une propriété ou libérez un bail.
                                    </p>
                                )}
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
                             <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Wallet className="w-4 h-4 text-slate-500"/> Conditions Financières
                            </h3>
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Loyer Mensuel <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            required 
                                            min="0"
                                            className="bg-[#0B1120] border-slate-700 text-emerald-400 font-bold pl-8"
                                            value={rent}
                                            onChange={(e) => setRent(e.target.value)}
                                        />
                                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">F</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Caution / Avance</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            min="0"
                                            className="bg-[#0B1120] border-slate-700 text-white pl-8"
                                            value={deposit}
                                            onChange={(e) => setDeposit(e.target.value)}
                                        />
                                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">F</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300 text-xs uppercase font-bold">Date d'entrée <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input 
                                            type="date" 
                                            required
                                            className="bg-[#0B1120] border-slate-700 text-white pl-10"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={loading || properties.length === 0}
                            className="w-full bg-[#F59E0B] hover:bg-yellow-500 text-black font-black uppercase tracking-wide h-14 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Générer le contrat de bail"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        {/* MODALE DE SUCCÈS (Identifiants) */}
        <TenantCredentialsModal 
            isOpen={showCredentials}
            onClose={handleCloseModal}
            tenantName={newCredentials.name}
            tenantPhone={newCredentials.phone} // On utilise l'email ou phone comme login
            tempPass={newCredentials.password}
        />
    </div>
  );
}
