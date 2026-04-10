"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Building2,
  Key,
  Briefcase,
  Loader2,
  ArrowRight,
  Palmtree,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { setUserRole } from "@/actions/onboarding";

// ─────────────────────────────────────────────
// Types stricts alignés sur le schéma Prisma
// ─────────────────────────────────────────────

/**
 * Sous-ensemble du Role enum Prisma exposé à l'onboarding.
 * Les rôles SUPER_ADMIN, AGENCY_ADMIN, ADMIN, ARTISAN, INVESTOR, AMBASSADOR
 * sont assignés manuellement — jamais via ce flow.
 */
type OnboardingRole = "GUEST" | "TENANT" | "OWNER" | "AGENT";

interface RoleDefinition {
  id: OnboardingRole;
  title: string;
  desc: string;
  icon: LucideIcon;
  colorKey: ColorKey;
}

type ColorKey = "cyan" | "blue" | "orange" | "emerald";

interface ColorTheme {
  bg: string;
  border: string;
  text: string;
  shadow: string;
  iconBg: string;
  iconSelected: string;
}

// ─────────────────────────────────────────────
// Constantes — extraites hors du render
// ─────────────────────────────────────────────

const ROLES: RoleDefinition[] = [
  {
    id: "GUEST",
    title: "Voyageur",
    desc: "Je veux réserver des séjours courts et trouver des logements meublés (Akwaba).",
    icon: Palmtree,
    colorKey: "cyan",
  },
  {
    id: "TENANT",
    title: "Locataire",
    desc: "Je cherche un logement longue durée à louer et signer mon bail en ligne.",
    icon: Key,
    colorKey: "blue",
  },
  {
    id: "OWNER",
    title: "Propriétaire",
    desc: "Je veux gérer mes biens, encaisser mes loyers via Wave ou Orange Money.",
    icon: Building2,
    colorKey: "orange",
  },
  {
    id: "AGENT",
    title: "Agent Immo",
    desc: "Je suis un professionnel — je gère des biens pour le compte de clients.",
    icon: Briefcase,
    colorKey: "emerald",
  },
];

const COLOR_THEMES: Record<ColorKey, ColorTheme> = {
  cyan: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/70",
    text: "text-cyan-400",
    shadow: "shadow-cyan-900/30",
    iconBg: "bg-slate-800 text-slate-400",
    iconSelected: "bg-cyan-500 text-white",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/70",
    text: "text-blue-400",
    shadow: "shadow-blue-900/30",
    iconBg: "bg-slate-800 text-slate-400",
    iconSelected: "bg-blue-500 text-white",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/70",
    text: "text-orange-400",
    shadow: "shadow-orange-900/30",
    iconBg: "bg-slate-800 text-slate-400",
    iconSelected: "bg-orange-500 text-white",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/70",
    text: "text-emerald-400",
    shadow: "shadow-emerald-900/30",
    iconBg: "bg-slate-800 text-slate-400",
    iconSelected: "bg-emerald-500 text-white",
  },
};

// ─────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      const result = await setUserRole(selectedRole);

      if (!result.success) {
        throw new Error(result.error ?? "Erreur inconnue");
      }

      toast.success("Profil configuré avec succès !");

      // Invalide le cache du router avant la redirection dure
      router.refresh();

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-200 font-sans">
      {/* En-tête */}
      <header className="text-center mb-10 space-y-4 max-w-2xl flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-orange-500/10 mb-2 border border-orange-500/20 shadow-lg shadow-orange-500/10">
          <span className="text-orange-500 font-black text-2xl tracking-tighter uppercase">
            BABIMMO
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Bienvenue à bord&nbsp;🚀
        </h1>
        <p className="text-lg text-slate-400">
          Dites-nous comment vous comptez utiliser la plateforme pour
          personnaliser votre expérience.
        </p>
      </header>

      {/* Grille des rôles */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl mb-12"
        role="radiogroup"
        aria-label="Choisissez votre profil"
      >
        {ROLES.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            theme={COLOR_THEMES[role.colorKey]}
            isSelected={selectedRole === role.id}
            onSelect={setSelectedRole}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selectedRole || loading}
        aria-disabled={!selectedRole || loading}
        className={cn(
          "group relative overflow-hidden rounded-full py-4 px-12 font-bold text-lg transition-all duration-300",
          selectedRole && !loading
            ? "bg-white text-black hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] cursor-pointer"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        )}
      >
        <span className="relative z-10 flex items-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Configuration...</span>
            </>
          ) : (
            <>
              <span>Commencer l&apos;aventure</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Composant RoleCard — typé, sans any
// ─────────────────────────────────────────────

interface RoleCardProps {
  role: RoleDefinition;
  theme: ColorTheme;
  isSelected: boolean;
  onSelect: (id: OnboardingRole) => void;
}

function RoleCard({ role, theme, isSelected, onSelect }: RoleCardProps) {
  const { id, title, desc, icon: Icon } = role;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className={cn(
        "relative group cursor-pointer rounded-3xl border-2 p-6 transition-all duration-300",
        "flex flex-col items-center text-center gap-4",
        "hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        isSelected
          ? cn(theme.bg, theme.border, "shadow-2xl", theme.shadow)
          : "bg-slate-900 border-slate-800 hover:border-slate-600"
      )}
    >
      {/* Indicateur de sélection */}
      {isSelected && (
        <div
          className={cn(
            "absolute top-4 right-4 animate-in zoom-in",
            theme.text
          )}
          aria-hidden="true"
        >
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )}

      {/* Icône */}
      <div
        className={cn(
          "p-4 rounded-2xl transition-colors duration-300",
          isSelected ? theme.iconSelected : theme.iconBg
        )}
      >
        <Icon className="w-8 h-8" aria-hidden="true" />
      </div>

      {/* Texte */}
      <div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
