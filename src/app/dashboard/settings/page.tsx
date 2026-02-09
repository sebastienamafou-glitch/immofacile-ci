"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, User, MapPin, Briefcase, CreditCard, Lock, Shield, Download, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api"; // Votre client axios configuré
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import Swal from "sweetalert2";
import { exportUserData, deleteUserAccount } from "@/actions/settings"; // ✅ Import des Server Actions RGPD

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: "",
    email: "", // Read-only
    phone: "",
    address: "",
    jobTitle: "",
    paymentMethod: "ORANGE_MONEY",
    paymentNumber: "",
    currentPassword: "",
    newPassword: ""
  });

  const [role, setRole] = useState("");

  // 1. CHARGEMENT DES DONNÉES
  useEffect(() => {
    const fetchUser = async () => {
        try {
            const res = await api.get("/user/settings"); 
            if (res.data) {
                setFormData(prev => ({
                    ...prev,
                    name: res.data.name || "",
                    email: res.data.email || "",
                    phone: res.data.phone || "",
                    address: res.data.address || "",
                    jobTitle: res.data.jobTitle || "",
                    paymentMethod: res.data.paymentMethod || "ORANGE_MONEY",
                    paymentNumber: res.data.paymentNumber || ""
                }));
                setRole(res.data.role);
            }
        } catch (e) {
            toast.error("Impossible de charger vos informations.");
        } finally {
            setLoading(false);
        }
    };
    fetchUser();
  }, []);

  // 2. SAUVEGARDE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        await api.patch("/user/settings", formData);
        toast.success("Profil mis à jour avec succès !");
        // Reset password fields for security
        setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
    } catch (error: any) {
        toast.error(error.response?.data?.error || "Erreur lors de la sauvegarde.");
    } finally {
        setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paramètres du Compte</h1>
        <p className="text-slate-500 mt-2">Gérez vos informations personnelles et vos préférences de sécurité.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: IDENTITÉ */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-orange-500"/> Informations Personnelles</CardTitle>
                <CardDescription>Ces informations sont visibles sur vos contrats et factures.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Nom Complet</Label>
                    <Input name="name" value={formData.name} onChange={handleChange} placeholder="Votre nom" />
                </div>
                <div className="space-y-2">
                    <Label>Email (Non modifiable)</Label>
                    <Input value={formData.email} disabled className="bg-slate-100 text-slate-500" />
                </div>
                <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+225..." />
                </div>
                <div className="space-y-2">
                    <Label>Adresse Physique</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <Input name="address" value={formData.address} onChange={handleChange} className="pl-10" placeholder="Commune, Quartier..." />
                    </div>
                </div>
                {/* Champ Métier (Pour les pros uniquement) */}
                {["AGENT", "ARTISAN", "OWNER"].includes(role) && (
                    <div className="space-y-2">
                        <Label>Profession / Titre</Label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <Input name="jobTitle" value={formData.jobTitle} onChange={handleChange} className="pl-10" placeholder="Ex: Gestionnaire de patrimoine" />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* SECTION 2: FINANCE (Pour recevoir de l'argent) */}
        {["OWNER", "AGENT", "ARTISAN"].includes(role) && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-500"/> Préférences de Paiement</CardTitle>
                    <CardDescription>Où souhaitez-vous recevoir vos revenus (Loyers, Commissions) ?</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Moyen de paiement favori</Label>
                        <select 
                            name="paymentMethod" 
                            value={formData.paymentMethod} 
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="WAVE">Wave</option>
                            <option value="ORANGE_MONEY">Orange Money</option>
                            <option value="MTN_MOMO">MTN MoMo</option>
                            <option value="VIREMENT">Virement Bancaire</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Numéro / RIB</Label>
                        <Input name="paymentNumber" value={formData.paymentNumber} onChange={handleChange} placeholder="07 XX XX XX XX" />
                    </div>
                </CardContent>
            </Card>
        )}

        {/* SECTION 3: SÉCURITÉ */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500"/> Sécurité</CardTitle>
                <CardDescription>Laissez vide si vous ne souhaitez pas changer de mot de passe.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Mot de passe actuel</Label>
                    <Input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Nouveau mot de passe</Label>
                    <Input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} />
                </div>
            </CardContent>
        </Card>

        {/* SECTION 4: ZONE DE DANGER (RGPD) */}
        <div className="pt-8">
            <h3 className="text-red-600 font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5"/> Zone de Danger
            </h3>
            
            <div className="border border-red-100 bg-red-50 rounded-xl p-6 space-y-6">
                
                {/* EXPORT DONNÉES */}
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800">Exporter mes données</h4>
                        <p className="text-sm text-slate-500">Recevez une copie de toutes vos données (JSON).</p>
                    </div>
                    <Button 
                        type="button"
                        onClick={async () => {
                            toast.promise(
                                async () => {
                                    const res = await exportUserData();
                                    if (res.error) throw new Error(res.error);
                                    
                                    // Créer un lien de téléchargement dynamique
                                    const blob = new Blob([res.data as string], { type: "application/json" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `immofacile-data-${Date.now()}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                },
                                {
                                    loading: 'Préparation de l\'export...',
                                    success: 'Téléchargement lancé ! 📂',
                                    error: 'Erreur lors de l\'export'
                                }
                            );
                        }}
                        variant="outline" 
                        className="border-slate-300 hover:bg-white"
                    >
                        <Download className="w-4 h-4 mr-2"/> Télécharger
                    </Button>
                </div>

                <Separator className="bg-red-200/50"/>

                {/* SUPPRESSION COMPTE */}
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-red-600">Supprimer mon compte</h4>
                        <p className="text-sm text-red-400">Cette action est irréversible. Vos données seront anonymisées.</p>
                    </div>
                    <Button 
                        type="button"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                            Swal.fire({
                                title: 'Êtes-vous sûr ?',
                                text: "Vous ne pourrez pas revenir en arrière. Vos abonnements et annonces seront désactivés.",
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                cancelButtonColor: '#3085d6',
                                confirmButtonText: 'Oui, supprimer mon compte',
                                cancelButtonText: 'Annuler'
                            }).then(async (result) => {
                                if (result.isConfirmed) {
                                    const res = await deleteUserAccount();
                                    if (res.error) {
                                        Swal.fire('Erreur', res.error, 'error');
                                    } else {
                                        await Swal.fire('Supprimé !', 'Votre compte a été anonymisé.', 'success');
                                        signOut({ callbackUrl: '/' }); // Déconnexion forcée
                                    }
                                }
                            })
                        }}
                    >
                        <Trash2 className="w-4 h-4 mr-2"/> Supprimer le compte
                    </Button>
                </div>
            </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all">
                {saving ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Enregistrement...</>
                ) : (
                    <><Save className="mr-2 h-5 w-5" /> Sauvegarder les modifications</>
                )}
            </Button>
        </div>

      </form>
    </div>
  );
}
