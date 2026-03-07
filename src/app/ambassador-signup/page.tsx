"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, Phone, User, Mail, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ✅ TYPAGE STRICT DU FORMULAIRE
interface SignupFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

// ✅ TYPAGE STRICT DE L'ERREUR API (Fini les "any")
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function AmbassadorSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // États pour l'UI
  const [showPassword, setShowPassword] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);

  const [formData, setFormData] = useState<SignupFormData>({
    name: "", phone: "", email: "", password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptCGU) {
        toast.error("Veuillez accepter les Conditions Générales pour continuer.");
        return;
    }

    setLoading(true);

    try {
      // 1. Création du compte via l'API
      const res = await api.post("/auth/ambassador-signup", formData);
      
      if (res.data.success) {
        setIsSuccess(true);
        toast.success("Compte créé ! Connexion en cours...");
        
        // 2. Connexion automatique en arrière-plan
        const signInResult = await signIn("credentials", {
            phone: formData.phone,
            password: formData.password,
            redirect: false,
        });

        if (signInResult?.error) {
            toast.error("Erreur lors de la connexion automatique.");
            router.push("/login");
        } else {
            // 3. Redirection vers le tableau de bord
            router.push("/dashboard/ambassador");
            router.refresh();
        }
      }
    } catch (error: unknown) {
        // ✅ Utilisation du type strict au lieu de "any"
        const apiErr = error as ApiError;
        toast.error(apiErr.response?.data?.error || "Une erreur de connexion est survenue");
        setLoading(false);
    }
  };

  if (isSuccess) {
      return (
          <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6" />
              <h1 className="text-3xl font-black text-white mb-2">Compte créé !</h1>
              <p className="text-slate-400 max-w-sm mb-8">
                  Félicitations, vous êtes maintenant Apporteur d'Affaires certifié Babimmo. Redirection vers votre espace...
              </p>
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Intégration du Logo Officiel */}
        <div className="flex justify-center mb-6">
            <Image 
                src="/logo.png" 
                alt="Logo Babimmo" 
                width={80} 
                height={80} 
                className="rounded-2xl bg-white p-1 shadow-lg shadow-orange-500/20"
                priority
            />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          Devenir Apporteur d'Affaires
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Publiez vos biens, trouvez des locataires et sécurisez 100% de vos commissions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-3xl sm:px-10 border border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="space-y-2">
              <Label className="text-slate-300 font-bold text-xs uppercase">Nom Complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input 
                    name="name" required value={formData.name} onChange={handleChange}
                    placeholder="Ex: Kouassi Jean"
                    className="pl-10 bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-bold text-xs uppercase">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input 
                    name="phone" type="tel" required value={formData.phone} onChange={handleChange}
                    placeholder="Ex: 07 07 ..."
                    className="pl-10 bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-bold text-xs uppercase">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input 
                    name="email" type="email" value={formData.email} onChange={handleChange}
                    placeholder="jean@email.com"
                    className="pl-10 bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-bold text-xs uppercase">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    minLength={6} 
                    value={formData.password} 
                    onChange={handleChange}
                    placeholder="Minimum 6 caractères"
                    className="pl-10 pr-10 bg-slate-950 border-slate-800 text-white h-12 focus:border-orange-500"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
                <input 
                    type="checkbox" 
                    id="cgu"
                    checked={acceptCGU}
                    onChange={(e) => setAcceptCGU(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer accent-orange-500"
                />
                <Label htmlFor="cgu" className="text-sm text-slate-300 leading-tight cursor-pointer font-normal">
                    J'accepte les <Link href="/terms" className="text-orange-500 font-bold hover:underline">Conditions Générales</Link> et la <Link href="/privacy" className="text-orange-500 font-bold hover:underline">Politique de Confidentialité</Link>.
                </Label>
            </div>

            <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 text-lg rounded-xl transition-all shadow-lg shadow-orange-600/20 mt-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Créer mon Compte"}
            </Button>

          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-800">
            <div className="text-sm text-slate-400">
              Déjà membre ?{" "}
              <Link href="/login" className="font-bold text-white hover:text-orange-400 transition inline-flex items-center justify-center gap-1 mt-1">
                Connexion <CheckCircle2 className="w-4 h-4 text-orange-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
