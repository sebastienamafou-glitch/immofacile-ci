"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, User, Mail, Phone, Lock, Eye, EyeOff, Building2, Home } from "lucide-react";
import { cn } from "@/lib/utils"; 

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  // ✅ NOUVEAU : État pour le rôle
  // Si on vient d'une annonce, on force TENANT, sinon par défaut TENANT (plus sûr que OWNER)
  const [role, setRole] = useState<"TENANT" | "OWNER">("TENANT");

  // Si redirectUrl existe, on force le rôle Locataire dès le chargement
  useEffect(() => {
    if (redirectUrl) setRole("TENANT");
  }, [redirectUrl]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
        toast.error("Veuillez accepter les conditions.");
        return;
    }

    setLoading(true);
    try {
      await api.post('/auth/signup', {
          ...formData,
          role: role // ✅ On utilise le rôle choisi par l'utilisateur
      });

      toast.success("Compte créé avec succès !");

      const nextStep = redirectUrl 
        ? `/login?registered=true&redirect=${encodeURIComponent(redirectUrl)}`
        : '/login?registered=true';

      router.push(nextStep);

    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* --- SÉLECTEUR DE RÔLE (Affiché uniquement si pas de redirection) --- */}
                {!redirectUrl && (
                    <div className="grid grid-cols-2 gap-3 mb-4 p-1 bg-black/40 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setRole("TENANT")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                role === "TENANT" 
                                    ? "bg-orange-500 text-white shadow-lg" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <User className="w-4 h-4" /> Locataire
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("OWNER")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                role === "OWNER" 
                                    ? "bg-orange-500 text-white shadow-lg" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Building2 className="w-4 h-4" /> Propriétaire
                        </button>
                    </div>
                )}

                {/* --- Message Spécial si on vient d'une annonce --- */}
                {redirectUrl && (
                    <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl mb-4 text-center">
                        <p className="text-blue-200 text-xs font-bold flex items-center justify-center gap-2">
                            <Home className="w-4 h-4" />
                            Création de compte Locataire
                        </p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label className="text-xs uppercase font-bold text-slate-400 ml-1">Nom Complet</Label>
                    <div className="relative group">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                            required 
                            placeholder={role === "OWNER" ? "Ex: SCI Immo ou Jean Kouassi" : "Ex: Kouassi Jean"} 
                            className="pl-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-slate-400 ml-1">Email</Label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                required type="email" placeholder="jean@email.com" 
                                className="pl-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-slate-400 ml-1">Téléphone</Label>
                        <div className="relative group">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                            <Input 
                                required type="tel" placeholder="07 07 ..." 
                                className="pl-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs uppercase font-bold text-slate-400 ml-1">Mot de passe</Label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                            required 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Minimum 8 caractères" 
                            className="pl-10 pr-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-11"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-white transition"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start space-x-3 pt-2">
                     <div className="flex items-center h-5">
                        <input 
                            id="terms" 
                            type="checkbox" 
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                     </div>
                     <label htmlFor="terms" className="text-xs text-slate-400 leading-tight cursor-pointer select-none">
                         J'accepte les <Link href="/terms" target="_blank" className="text-orange-500 hover:underline font-bold">Conditions Générales</Link> et la <Link href="/privacy" target="_blank" className="text-orange-500 hover:underline font-bold">Politique de Confidentialité</Link>.
                     </label>
                </div>

                <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold h-12 rounded-xl mt-4 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : `Créer mon Compte ${role === 'OWNER' ? 'Propriétaire' : ''}`}
                </Button>

            </form>

            <div className="mt-6 text-center pt-6 border-t border-white/5">
                <p className="text-slate-400 text-sm">
                    Déjà membre ? <br/>
                    <Link href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} className="text-white font-bold hover:text-orange-500 transition inline-flex items-center gap-1 mt-1">
                        Connexion <ShieldCheck className="w-3 h-3" />
                    </Link>
                </p>
            </div>
        </div>
  );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/80 to-transparent"></div>

            <div className="relative z-10 w-full max-w-md px-4 py-8">
                <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    {/* ✅ LOGO CLIQUABLE & ANIMÉ */}
                    <Link href="/" className="relative w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 overflow-hidden border border-white/10 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group" title="Retour à l'accueil">
                        <Image src="/logo.png" alt="Logo ImmoFacile" width={64} height={64} className="object-contain p-2 group-hover:rotate-3 transition-transform duration-500" />
                    </Link>
                    
                    <h1 className="text-3xl font-black text-white tracking-tight text-center">
                        Rejoindre <span className="text-orange-500 italic">IMMOFACILE</span>
                    </h1>
                </div>
                
                <Suspense fallback={<div className="text-white text-center">Chargement...</div>}>
                    <SignupForm />
                </Suspense>
            </div>
        </div>
    );
}
