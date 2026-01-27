"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

// Schéma de validation robuste
const loginSchema = z.object({
  identifier: z.string().min(3, "L'identifiant est trop court"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/guest";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    try {
      const res = await signIn("credentials", { ...data, redirect: false });
      
      if (res?.error) {
        toast.error("Identifiants incorrects", {
          description: "Veuillez vérifier vos accès et réessayer.",
        });
      } else {
        toast.success("Authentification réussie", {
          description: "Ravi de vous revoir !",
        });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error("Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md bg-[#0B1120]/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Image src="/logo.png" alt="Logo" width={160} height={50} className="mx-auto mb-6 drop-shadow-2xl" />
        </motion.div>
        <h1 className="text-3xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Espace Client
        </h1>
        <p className="text-slate-500 mt-2 text-sm font-medium">Accédez à votre compte sécurisé Akwaba.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Champ Identifiant */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identifiant</label>
          <div className="relative group">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.identifier ? 'text-red-400' : 'text-slate-500 group-focus-within:text-orange-500'}`} />
            <input
              {...register("identifier")}
              type="text"
              placeholder="Email ou téléphone"
              className={`w-full bg-[#020617]/60 border ${errors.identifier ? 'border-red-500/50' : 'border-white/5'} text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-slate-600`}
            />
          </div>
          <AnimatePresence>
            {errors.identifier && (
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.identifier.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Champ Mot de passe */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mot de passe</label>
            <Link href="/forgot-password" className="text-[11px] font-bold text-orange-500/80 hover:text-orange-400 uppercase tracking-widest transition-colors">
              Oublié ?
            </Link>
          </div>
          <div className="relative group">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.password ? 'text-red-400' : 'text-slate-500 group-focus-within:text-orange-500'}`} />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full bg-[#020617]/60 border ${errors.password ? 'border-red-500/50' : 'border-white/5'} text-white rounded-2xl py-4 pl-12 pr-12 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-slate-600`}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-orange-500 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-xs mt-1 ml-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <button 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
          {loading ? <Loader2 className="animate-spin" /> : <>Se connecter <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="mt-10 pt-6 border-t border-white/5 text-center">
        <p className="text-slate-500 text-sm font-medium">
          Nouveau sur la plateforme ?{" "}
          <Link 
            href="/akwaba/signup"
            className="text-orange-500 font-bold hover:text-orange-400 transition-colors decoration-orange-500/30 underline underline-offset-4"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background avec Overlay Progressif */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-[0.15] scale-105" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/50 via-[#020617] to-[#020617]" />
      
      {/* Cercles de lumière d'ambiance */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />

      <Suspense fallback={<Loader2 className="animate-spin text-orange-500" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
