"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Building2, Key, Briefcase, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils"; 

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      // 1. Mise à jour en base de données
      const res = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      toast.success("Profil configuré ! Redirection...");
      
      // 2. FORCER LE RAFRAÎCHISSEMENT DE LA SESSION
      // C'est l'étape cruciale qui manquait : on dit à Next.js de relire les cookies
      router.refresh(); 

      // 3. Redirection avec un petit délai pour laisser le temps au cookie de s'écrire
      setTimeout(() => {
          if (selectedRole === "AGENT") window.location.href = "/dashboard/agent";
          else if (selectedRole === "OWNER") window.location.href = "/dashboard/owner";
          else window.location.href = "/dashboard/tenant";
      }, 1000);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-200">
      
      {/* HEADER AVEC LOGO CORRIGÉ */}
      <div className="text-center mb-12 space-y-4 max-w-2xl flex flex-col items-center">
        {/* Correction ici : flex flex-col items-center pour un centrage parfait */}
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-orange-500/10 mb-4 animate-in fade-in zoom-in duration-500 border border-orange-500/20 shadow-lg shadow-orange-500/10">
             <img src="/logo.png" alt="Logo" className="h-12 w-auto mb-2" onError={(e) => e.currentTarget.style.display='none'} /> 
             <div className="text-orange-500 font-black text-2xl tracking-tighter uppercase">IMMOFACILE</div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Bienvenue à bord ! 🚀</h1>
        <p className="text-lg text-slate-400">
          Pour personnaliser votre expérience, dites-nous comment vous comptez utiliser la plateforme.
        </p>
      </div>

      {/* CHOIX DU RÔLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-12">
        
        {/* CARTE 1 : LOCATAIRE */}
        <div 
            onClick={() => setSelectedRole("TENANT")}
            className={cn(
                "relative group cursor-pointer rounded-3xl border-2 p-8 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:scale-[1.02]",
                selectedRole === "TENANT" 
                    ? "bg-blue-600/10 border-blue-500 shadow-2xl shadow-blue-900/20" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
            )}
        >
            {selectedRole === "TENANT" && <div className="absolute top-4 right-4 text-blue-500 animate-in zoom-in"><CheckCircle2 className="w-6 h-6 fill-blue-500/20" /></div>}
            
            <div className={`p-4 rounded-2xl ${selectedRole === "TENANT" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"} transition-colors`}>
                <Key className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Je cherche un logement</h3>
                <p className="text-sm text-slate-400">Trouvez la maison de vos rêves, déposez votre dossier et payez votre loyer en ligne.</p>
            </div>
        </div>

        {/* CARTE 2 : PROPRIÉTAIRE */}
        <div 
            onClick={() => setSelectedRole("OWNER")}
            className={cn(
                "relative group cursor-pointer rounded-3xl border-2 p-8 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:scale-[1.02]",
                selectedRole === "OWNER" 
                    ? "bg-orange-600/10 border-orange-500 shadow-2xl shadow-orange-900/20" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
            )}
        >
            {selectedRole === "OWNER" && <div className="absolute top-4 right-4 text-orange-500 animate-in zoom-in"><CheckCircle2 className="w-6 h-6 fill-orange-500/20" /></div>}
            
            <div className={`p-4 rounded-2xl ${selectedRole === "OWNER" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400"} transition-colors`}>
                <Building2 className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Je suis Propriétaire</h3>
                <p className="text-sm text-slate-400">Gérez vos biens, encaissez les loyers automatiquement et suivez vos finances.</p>
            </div>
        </div>

        {/* CARTE 3 : AGENT */}
        <div 
            onClick={() => setSelectedRole("AGENT")}
            className={cn(
                "relative group cursor-pointer rounded-3xl border-2 p-8 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:scale-[1.02]",
                selectedRole === "AGENT" 
                    ? "bg-emerald-600/10 border-emerald-500 shadow-2xl shadow-emerald-900/20" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
            )}
        >
            {selectedRole === "AGENT" && <div className="absolute top-4 right-4 text-emerald-500 animate-in zoom-in"><CheckCircle2 className="w-6 h-6 fill-emerald-500/20" /></div>}
            
            <div className={`p-4 rounded-2xl ${selectedRole === "AGENT" ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"} transition-colors`}>
                <Briefcase className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Je suis Agent Immo</h3>
                <p className="text-sm text-slate-400">Trouvez des missions, réalisez des visites et gagnez des commissions.</p>
            </div>
        </div>

      </div>

      {/* BOUTON ACTION */}
      <button
        onClick={handleConfirm}
        disabled={!selectedRole || loading}
        className={`
            group relative overflow-hidden rounded-full py-4 px-12 font-bold text-lg transition-all duration-300
            ${selectedRole ? "bg-white text-black hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] cursor-pointer" : "bg-slate-800 text-slate-500 cursor-not-allowed"}
        `}
      >
        <span className="relative z-10 flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "Commencer l'aventure"}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        </span>
      </button>

    </div>
  );
}
