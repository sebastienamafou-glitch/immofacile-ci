"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner"; // Assurez-vous d'avoir installé sonner ou utilisez votre système de toast habituel
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, LockKeyhole, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Si disponible, sinon on fera une div simple

// --- 1. SCHÉMA DE SÉCURITÉ STRICT ---
const resetSchema = z.object({
  password: z.string()
    .min(8, "8 caractères minimum")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre")
    .regex(/[^a-zA-Z0-9]/, "Au moins un caractère spécial (@, #, !, etc.)"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

// Composant Interne (Logique)
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);

  // Hook Form
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    mode: "onChange" // Validation en temps réel pour l'indicateur
  });

  const passwordValue = watch("password") || "";

  // Calcul de la force du mot de passe (visuel)
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(passwordValue);

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
        toast.error("Lien invalide ou expiré.");
        return;
    }

    try {
      await api.post('/auth/reset-password', { 
        token, 
        newPassword: data.password 
      });
      setSuccess(true);
      toast.success("Mot de passe sécurisé enregistré !");
      setTimeout(() => router.push('/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Le lien a expiré. Veuillez recommencer.");
    }
  };

  if (success) {
      return (
        <div className="text-center space-y-6 py-8 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <div className="space-y-2">
                <h3 className="font-black text-2xl text-white">Sécurisation Réussie</h3>
                <p className="text-slate-400 text-sm max-w-[280px] mx-auto">
                    Votre coffre-fort numérique est à nouveau accessible.
                </p>
            </div>
            <Button onClick={() => router.push('/login')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full h-12 rounded-xl">
                Accéder à mon espace
            </Button>
        </div>
      );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        {/* Champ Mot de passe */}
        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Nouveau mot de passe</Label>
            <div className="relative group">
                <Input 
                    {...register("password")}
                    type={showPass ? "text" : "password"} 
                    className={`bg-[#0B1120] border-slate-700 text-white focus:border-[#F59E0B] h-12 pr-10 transition-all ${errors.password ? "border-red-500 focus:border-red-500" : ""}`}
                    placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
            </div>
            
            {/* Indicateur de force & Erreurs */}
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                <div 
                    className={`h-full transition-all duration-500 ease-out ${
                        strength < 50 ? "bg-red-500" : strength < 100 ? "bg-yellow-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${strength}%` }}
                />
            </div>
            {errors.password ? (
                <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>
            ) : (
                <p className={`text-xs mt-1 text-right font-bold transition-colors ${
                    strength === 100 ? "text-emerald-500" : "text-slate-600"
                }`}>
                    {strength === 100 ? "Excellente sécurité" : strength > 50 ? "Moyen" : "Faible"}
                </p>
            )}
        </div>

        {/* Champ Confirmation */}
        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Confirmer</Label>
            <Input 
                {...register("confirmPassword")}
                type="password" 
                className={`bg-[#0B1120] border-slate-700 text-white focus:border-[#F59E0B] h-12 transition-all ${errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}`}
                placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs font-medium">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-[#F59E0B] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-black h-12 text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 rounded-xl transition-all active:scale-95">
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Verrouiller mon compte"}
        </Button>
    </form>
  );
}

// Composant Principal
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1470&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <Card className="w-full max-w-md bg-[#0F172A]/80 border-white/10 text-white backdrop-blur-2xl shadow-2xl relative z-10 rounded-[2rem]">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 rotate-3 border border-white/10">
             <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">Réinitialisation</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Créez un nouveau mot de passe pour <br/>votre compte <span className="text-orange-500 font-bold">ImmoFacile</span>.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
            <Suspense fallback={<div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-[#F59E0B] w-8 h-8"/></div>}>
                <ResetPasswordForm />
            </Suspense>
        </CardContent>

        <CardFooter className="justify-center border-t border-white/5 pt-6 pb-8">
            <Link href="/login" className="flex items-center text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest group">
                <ArrowLeft className="w-3 h-3 mr-2 group-hover:-translate-x-1 transition-transform" /> Retour connexion
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
