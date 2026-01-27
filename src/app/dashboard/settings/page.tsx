"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, User, Lock, Wallet } from "lucide-react";

// --- 1. SCHÉMAS DE VALIDATION (SÉCURITÉ) ---
const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Format d'email invalide"),
  phone: z.string().min(10, "Numéro invalide (min 10 chiffres)"),
  address: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Le mot de passe doit faire 8 caractères min."),
  confirmPassword: z.string().min(8, "Confirmation requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

const financeSchema = z.object({
  // Zod crée un type strict "Union" ici
  provider: z.enum(["WAVE", "OM", "MTN", "BANK"]), 
  number: z.string().min(5, "Numéro de compte requis"),
});

// --- 2. DÉFINITION DES TYPES TYPESCRIPT (LA CORRECTION EST ICI) ---
// On extrait le type TypeScript directement depuis le schéma Zod
type ProfileFormValues = z.infer<typeof profileSchema>;
type FinanceFormValues = z.infer<typeof financeSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState("");

  // --- 3. HOOKS TYPÉS STRICTEMENT ---
  // On passe le type <Generique> à useForm pour éviter l'erreur de typage
  const profileForm = useForm<ProfileFormValues>({ 
    resolver: zodResolver(profileSchema), 
    defaultValues: { name: "", email: "", phone: "", address: "" } 
  });

  const financeForm = useForm<FinanceFormValues>({ 
    resolver: zodResolver(financeSchema), 
    defaultValues: { 
      provider: "WAVE", // Maintenant TypeScript sait que c'est valide
      number: "" 
    } 
  });

  const passwordForm = useForm<PasswordFormValues>({ 
    resolver: zodResolver(passwordSchema), 
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } 
  });

  // 1. CHARGEMENT DES DONNÉES
  useEffect(() => {
    const fetchUserData = async () => {
        try {
            const res = await api.get('/auth/me');
            if (res.data.success) {
                // Supporte les deux formats de réponse possibles (selon votre backend)
                const user = res.data.user || res.data.data;
                
                if (user) {
                    // Pré-remplissage des formulaires
                    profileForm.reset({
                        name: user.name || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        address: user.address || ""
                    });

                    // Pour finance, on doit s'assurer que la valeur est valide pour l'enum
                    const providerValue = (["WAVE", "OM", "MTN", "BANK"].includes(user.paymentMethod) 
                        ? user.paymentMethod 
                        : "WAVE") as "WAVE" | "OM" | "MTN" | "BANK";

                    financeForm.reset({
                        provider: providerValue,
                        number: user.paymentNumber || user.phone || ""
                    });
                    
                    setUserAvatar(user.name || "User");
                }
            }
        } catch (error) {
            toast.error("Impossible de charger vos informations.");
        } finally {
            setLoading(false);
        }
    };
    fetchUserData();
  }, [profileForm, financeForm]);

  // 2. ACTIONS DE SAUVEGARDE
  const onSaveProfile = async (data: ProfileFormValues) => {
    try {
        await api.put('/auth/update-profile', data);
        toast.success("Profil mis à jour !");
        setUserAvatar(data.name);
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Erreur sauvegarde profil.");
    }
  };

  const onSaveFinance = async (data: FinanceFormValues) => {
    try {
        await api.put('/auth/update-finance', data);
        toast.success("Moyen de paiement mis à jour !");
    } catch (e: any) {
        toast.error("Erreur sauvegarde finances.");
    }
  };

  const onSavePassword = async (data: PasswordFormValues) => {
    try {
        await api.put('/auth/update-password', {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword
        });
        toast.success("Mot de passe modifié avec succès !");
        passwordForm.reset(); 
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Le mot de passe actuel est incorrect.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#060B18]"><Loader2 className="animate-spin text-orange-500 w-10 h-10" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Paramètres</h1>
        <p className="text-slate-400">Gérez vos informations et la sécurité de votre compte.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        
        {/* NAVIGATION */}
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl w-full grid grid-cols-3 md:grid-cols-3">
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#F59E0B] data-[state=active]:text-black py-3 rounded-lg font-bold"><User className="w-4 h-4 mr-2" /> Profil</TabsTrigger>
            <TabsTrigger value="finance" className="data-[state=active]:bg-[#F59E0B] data-[state=active]:text-black py-3 rounded-lg font-bold"><Wallet className="w-4 h-4 mr-2" /> Finances</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-[#F59E0B] data-[state=active]:text-black py-3 rounded-lg font-bold"><Lock className="w-4 h-4 mr-2" /> Sécurité</TabsTrigger>
        </TabsList>

        {/* --- ONGLET PROFIL --- */}
        <TabsContent value="profile">
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)}>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="flex flex-row items-center gap-6">
                        <Avatar className="w-16 h-16 border-2 border-[#F59E0B]">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${userAvatar}&background=F59E0B&color=000`} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>Identité</CardTitle>
                            <CardDescription className="text-slate-400">Informations visibles sur les contrats.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom Complet</Label>
                                <Input {...profileForm.register("name")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                                {profileForm.formState.errors.name && <p className="text-red-500 text-xs">{profileForm.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...profileForm.register("email")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                                {profileForm.formState.errors.email && <p className="text-red-500 text-xs">{profileForm.formState.errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <Input {...profileForm.register("phone")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                            </div>
                            <div className="space-y-2">
                                <Label>Adresse</Label>
                                <Input {...profileForm.register("address")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={profileForm.formState.isSubmitting} className="bg-[#F59E0B] hover:bg-orange-600 text-black font-bold">
                            {profileForm.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />} Enregistrer
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </TabsContent>

        {/* --- ONGLET FINANCES --- */}
        <TabsContent value="finance">
            <form onSubmit={financeForm.handleSubmit(onSaveFinance)}>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader>
                        <CardTitle>Compte de Retrait</CardTitle>
                        <CardDescription>Destination des revenus locatifs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Opérateur</Label>
                                {/* CORRECTION : On utilise le controller field de React Hook Form pour le Select */}
                                <Select 
                                    onValueChange={(v) => financeForm.setValue("provider", v as "WAVE" | "OM" | "MTN" | "BANK")}
                                    value={financeForm.watch("provider")}
                                >
                                    <SelectTrigger className="bg-[#0B1120] border-slate-700"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                        <SelectItem value="WAVE">Wave CI</SelectItem>
                                        <SelectItem value="OM">Orange Money</SelectItem>
                                        <SelectItem value="MTN">MTN MoMo</SelectItem>
                                        <SelectItem value="BANK">Virement Bancaire</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Numéro / RIB</Label>
                                <Input {...financeForm.register("number")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                                {financeForm.formState.errors.number && <p className="text-red-500 text-xs">{financeForm.formState.errors.number.message}</p>}
                            </div>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex items-center gap-3">
                            <p className="text-xs text-slate-300">Les modifications de coordonnées bancaires déclenchent une alerte de sécurité par email.</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={financeForm.formState.isSubmitting} className="bg-[#F59E0B] hover:bg-orange-600 text-black font-bold">
                             {financeForm.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : "Mettre à jour"}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </TabsContent>

        {/* --- ONGLET SÉCURITÉ --- */}
        <TabsContent value="security">
            <form onSubmit={passwordForm.handleSubmit(onSavePassword)}>
                <Card className="bg-slate-900 border-slate-800 text-white">
                    <CardHeader>
                        <CardTitle>Mot de passe</CardTitle>
                        <CardDescription>Utilisez un mot de passe complexe (8 caractères min).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Mot de passe actuel</Label>
                            <Input type="password" {...passwordForm.register("currentPassword")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                            {passwordForm.formState.errors.currentPassword && <p className="text-red-500 text-xs">{passwordForm.formState.errors.currentPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Nouveau mot de passe</Label>
                            <Input type="password" {...passwordForm.register("newPassword")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                            {passwordForm.formState.errors.newPassword && <p className="text-red-500 text-xs">{passwordForm.formState.errors.newPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Confirmer nouveau mot de passe</Label>
                            <Input type="password" {...passwordForm.register("confirmPassword")} className="bg-[#0B1120] border-slate-700 focus:border-[#F59E0B]" />
                            {passwordForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs">{passwordForm.formState.errors.confirmPassword.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={passwordForm.formState.isSubmitting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                             {passwordForm.formState.isSubmitting ? <Loader2 className="animate-spin mr-2"/> : "Changer le mot de passe"}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </TabsContent>

      </Tabs>
    </div>
  );
}
