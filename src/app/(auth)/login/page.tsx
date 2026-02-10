"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
// ✅ 1. IMPORT OFFICIEL NEXTAUTH + GETSESSION (Le Pont)
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Cookies from "js-cookie";
import {
  Loader2, Lock, Eye, EyeOff, LogIn, Mail, ShieldCheck
} from "lucide-react";

// --- COMPOSANT INTERNE ---
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });

  // --- NETTOYAGE AU DÉMARRAGE ---
  useEffect(() => {
    // On rase tout pour garantir une session propre au chargement
    Cookies.remove('token');
    localStorage.removeItem('token');
    localStorage.removeItem('immouser');
    localStorage.removeItem('user');

    if (searchParams.get('registered') === 'true') {
        toast.success("Compte créé ! Connectez-vous maintenant.");
    }
    if (searchParams.get('error') === 'CredentialsSignin') {
        toast.error("Identifiants incorrects.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ 2. AUTHENTIFICATION SÉCURISÉE (Côté Serveur)
      const result = await signIn("credentials", {
        redirect: false,
        identifier: formData.identifier,
        password: formData.password,
      });

      if (result?.error) {
        console.error("Erreur Auth:", result.error);
        toast.error("Email ou mot de passe incorrect.");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // ✅ 3. LE PONT (BRIDGE) : SYNCHRONISATION FRONTEND
        // On récupère la session fraîchement créée pour satisfaire le code Legacy (api.ts)
        const session = await getSession();
        
        if (session?.user) {
            // A. On remplit 'immouser' pour l'affichage UI (Nom, Rôle...)
            localStorage.setItem('immouser', JSON.stringify(session.user));
            
            // B. On met un token "Passe-partout" pour que les guards clients (api.ts) laissent passer
            // (La vraie sécurité est gérée par le cookie HttpOnly invisible ici)
            localStorage.setItem('token', 'secure-session-active'); 
        }

        toast.success(`Connexion réussie !`);

        // ✅ 4. REDIRECTION "MILITARY GRADE" (Zero Trust)
        // On force le rechargement (window.location) pour valider les cookies côté serveur
        setTimeout(() => {
            const callbackUrl = searchParams.get('callbackUrl');
            const investType = searchParams.get('type');

            // A. Cas Investisseur
            if (investType === 'investor') {
                const packId = searchParams.get('pack');
                const amount = searchParams.get('amount');
                window.location.href = `/invest/dashboard?pack=${packId}&amount=${amount}&welcome=true`;
                return;
            }

            // B. Cas Redirection URL spécifique
            if (callbackUrl) {
                window.location.href = callbackUrl;
            }
            // C. Cas par défaut (Dashboard)
            else {
                window.location.href = '/dashboard';
            }
        }, 800);
      }
    } catch (error) {
      console.error("Erreur Critique Login:", error);
      toast.error("Erreur de connexion au serveur.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] relative overflow-hidden w-full">
      {/* FOND DÉCORATIF */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/80 to-transparent"></div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* HEADER LOGO */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Link href="/" className="relative w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 overflow-hidden border-2 border-white/10 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group" title="Retour à l'accueil">
                <Image src="/logo.png" alt="Logo ImmoFacile" width={80} height={80} className="object-contain p-2 group-hover:rotate-3 transition-transform duration-500" />
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight text-center">
                Espace <span className="text-orange-500 italic">CLIENT</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center">
                Connectez-vous pour gérer votre patrimoine en toute sécurité.
            </p>
        </div>

        {/* CARTE FORMULAIRE */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <Label className="text-xs uppercase font-bold text-slate-400 ml-1">Email ou Téléphone</Label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                        <Input
                            required
                            autoFocus
                            type="text"
                            placeholder="Ex: koffi@immofacile.ci"
                            className="pl-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-12"
                            value={formData.identifier}
                            onChange={e => setFormData({...formData, identifier: e.target.value})}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-xs uppercase font-bold text-slate-400">Mot de passe</Label>
                        <Link href="/forgot-password" title="Récupérer mon accès" className="text-xs text-orange-500 hover:text-orange-400 font-bold transition">
                            Oublié ?
                        </Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                        <Input
                            required
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10 bg-black/40 border-slate-700 text-white focus:border-orange-500 focus:ring-orange-500/20 rounded-xl h-12"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-500 hover:text-white transition p-1"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-95 mt-2"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                        <span className="flex items-center gap-2">Se connecter <LogIn className="w-4 h-4" /></span>
                    )}
                </Button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-white/5">
                <p className="text-slate-400 text-sm">
                    Pas encore de compte ? <br/>
                    <Link
                        href={`/signup${searchParams.get('callbackUrl') ? '?callbackUrl=' + searchParams.get('callbackUrl') : ''}`}
                        className="text-white font-bold hover:text-orange-500 transition inline-flex items-center gap-1 mt-1 group"
                    >
                        Créer un compte maintenant <ShieldCheck className="w-3 h-3 group-hover:text-orange-500" />
                    </Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}

// --- EXPORT PRINCIPAL ---
export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 w-12 h-12" />
        </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
