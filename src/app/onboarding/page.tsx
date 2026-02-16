"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Building2, Key, Briefcase, Loader2, ArrowRight, Palmtree } from "lucide-react"; // Ajout Palmtree
import { cn } from "@/lib/utils"; 
import { setUserRole } from "@/actions/onboarding"; // ✅ Import Server Action

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      // ✅ APPEL SERVER ACTION
      const result = await setUserRole(selectedRole);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success("Profil configuré ! Redirection...");
      
      // Forcer le rafraîchissement
      router.refresh(); 

      // Redirection
      if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
      }

    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-200 font-sans">
      
      <div className="text-center mb-10 space-y-4 max-w-2xl flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-orange-500/10 mb-2 border border-orange-500/20 shadow-lg shadow-orange-500/10">
             <div className="text-orange-500 font-black text-2xl tracking-tighter uppercase">IMMOFACILE</div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Bienvenue à bord ! 🚀</h1>
        <p className="text-lg text-slate-400">
          Pour personnaliser votre expérience, dites-nous comment vous comptez utiliser la plateforme.
        </p>
      </div>

      {/* GRILLE DES RÔLES (Maintenant avec 4 choix) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl mb-12">
        
        {/* 1. VOYAGEUR (Guest) - NOUVEAU */}
        <RoleCard 
            id="GUEST"
            title="Voyageur"
            desc="Je veux réserver des séjours uniques (Akwaba)."
            icon={Palmtree}
            colorClass="cyan"
            selected={selectedRole === "GUEST"}
            onClick={setSelectedRole}
        />

        {/* 2. LOCATAIRE */}
        <RoleCard 
            id="TENANT"
            title="Locataire"
            desc="Je cherche un logement longue durée à louer."
            icon={Key}
            colorClass="blue"
            selected={selectedRole === "TENANT"}
            onClick={setSelectedRole}
        />

        {/* 3. PROPRIÉTAIRE */}
        <RoleCard 
            id="OWNER"
            title="Propriétaire"
            desc="Je veux gérer mes biens et encaisser mes loyers."
            icon={Building2}
            colorClass="orange"
            selected={selectedRole === "OWNER"}
            onClick={setSelectedRole}
        />

        {/* 4. AGENT */}
        <RoleCard 
            id="AGENT"
            title="Agent Immo"
            desc="Je suis un professionnel de l'immobilier."
            icon={Briefcase}
            colorClass="emerald"
            selected={selectedRole === "AGENT"}
            onClick={setSelectedRole}
        />

      </div>

      <button
        onClick={handleConfirm}
        disabled={!selectedRole || loading}
        className={`
            group relative overflow-hidden rounded-full py-4 px-12 font-bold text-lg transition-all duration-300
            ${selectedRole ? "bg-white text-black hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]" : "bg-slate-800 text-slate-500 cursor-not-allowed"}
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

// Petit composant pour éviter la répétition du code
function RoleCard({ id, title, desc, icon: Icon, colorClass, selected, onClick }: any) {
    const colors: any = {
        cyan: { bg: "bg-cyan-600/10", border: "border-cyan-500", text: "text-cyan-500", fill: "fill-cyan-500/20", shadow: "shadow-cyan-900/20", bgIcon: "bg-cyan-500" },
        blue: { bg: "bg-blue-600/10", border: "border-blue-500", text: "text-blue-500", fill: "fill-blue-500/20", shadow: "shadow-blue-900/20", bgIcon: "bg-blue-500" },
        orange: { bg: "bg-orange-600/10", border: "border-orange-500", text: "text-orange-500", fill: "fill-orange-500/20", shadow: "shadow-orange-900/20", bgIcon: "bg-orange-500" },
        emerald: { bg: "bg-emerald-600/10", border: "border-emerald-500", text: "text-emerald-500", fill: "fill-emerald-500/20", shadow: "shadow-emerald-900/20", bgIcon: "bg-emerald-500" },
    };
    const theme = colors[colorClass];

    return (
        <div 
            onClick={() => onClick(id)}
            className={cn(
                "relative group cursor-pointer rounded-3xl border-2 p-6 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:scale-[1.02]",
                selected 
                    ? `${theme.bg} ${theme.border} shadow-2xl ${theme.shadow}` 
                    : "bg-slate-900 border-slate-800 hover:border-slate-600"
            )}
        >
            {selected && <div className={`absolute top-4 right-4 ${theme.text} animate-in zoom-in`}><CheckCircle2 className={`w-6 h-6 ${theme.fill}`} /></div>}
            
            <div className={`p-4 rounded-2xl ${selected ? `${theme.bgIcon} text-white` : "bg-slate-800 text-slate-400"} transition-colors`}>
                <Icon className="w-8 h-8" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
