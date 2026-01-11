"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Key, Users, Wallet, 
  FileText, Settings, LogOut, Shield, 
  ScrollText, Hammer, LifeBuoy,
  ClipboardCheck, MapPin, ClipboardList, UserCheck,
  ShieldCheck, Receipt, Briefcase, Landmark, Server
} from "lucide-react";

// --- 1. DÉFINITION STATIQUE DES MENUS ---
const MENUS = {
  OWNER: [
    { icon: LayoutDashboard, label: "Vue d'ensemble", href: "/dashboard/owner" },
    { icon: Key, label: "Mes Propriétés", href: "/dashboard/owner/properties" },
    { icon: Users, label: "Mes Locataires", href: "/dashboard/owner/tenants" },
    { icon: UserCheck, label: "Candidatures", href: "/dashboard/owner/candidates" },
    { icon: FileText, label: "Baux & Contrats", href: "/dashboard/owner/leases" },
    { icon: ClipboardList, label: "États des lieux", href: "/dashboard/owner/inventory" },
    { icon: Hammer, label: "Maintenance", href: "/dashboard/owner/maintenance" },
    { icon: Wallet, label: "Mes Finances", href: "/dashboard/owner/finance" },
    { icon: Receipt, label: "Mes Dépenses", href: "/dashboard/owner/expenses" },
    { icon: Landmark, label: "Fiscalité & Impôts", href: "/dashboard/owner/finance/tax" },
    { icon: Wallet, label: "Retraits", href: "/dashboard/owner/withdraw" },
  ],
  TENANT: [
    { icon: LayoutDashboard, label: "Mon Espace", href: "/dashboard/tenant" },
    { icon: Receipt, label: "Mes Paiements", href: "/dashboard/tenant/payments" },
    { icon: FileText, label: "Mon Contrat", href: "/dashboard/tenant/contract" },
    { icon: Shield, label: "Signaler Incident", href: "/dashboard/tenant/incidents" },
    { icon: ScrollText, label: "Mes Documents", href: "/dashboard/tenant/documents" },
  ],
  AGENT: [
    { icon: LayoutDashboard, label: "Tableau de Bord", href: "/dashboard/agent" }, 
    { icon: MapPin, label: "Missions & Marché", href: "/dashboard/agent/visits" }, 
    { icon: ClipboardCheck, label: "Dossiers Locataires", href: "/dashboard/agent/files" }, 
    { icon: Key, label: "Biens sous Gestion", href: "/dashboard/agent/properties" }
  ],
  // ✅ MENU ADMIN COMPLET & CORRIGÉ
  ADMIN: [
    { icon: Server, label: "Command Center", href: "/dashboard/admin" }, 
    { icon: Users, label: "Utilisateurs", href: "/dashboard/admin/users" }, 
    { icon: Key, label: "Parc Immobilier", href: "/dashboard/admin/properties" },
    { icon: Wallet, label: "Finances Globales", href: "/dashboard/admin/finance" }, 
    { icon: Briefcase, label: "Agents", href: "/dashboard/admin/agents" },
    { icon: Hammer, label: "Artisans", href: "/dashboard/admin/artisans" }, 
    { icon: ShieldCheck, label: "KYC & Sécurité", href: "/dashboard/admin/kyc" },
    { icon: ScrollText, label: "Journal d'Audit", href: "/dashboard/admin/logs" },
  ]
};

const COMMON_ITEMS = [
  { icon: Settings, label: "Paramètres", href: "/dashboard/settings" },
  { icon: LifeBuoy, label: "Centre d'aide", href: "/dashboard/help" },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
        // ✅ CORRECTION MAJEURE : On lit 'immouser' (la nouvelle clé standard)
        // Fallback sur 'user' au cas où, pour la compatibilité
        const storedUser = localStorage.getItem('immouser') || localStorage.getItem('user');
        
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    } catch(e) {
        console.error("Erreur lecture user sidebar");
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('immouser'); // On nettoie tout proprement
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const getRootPath = () => {
    if (!user) return "/login";
    if (user.role === 'ADMIN') return "/dashboard/admin";
    if (user.role === 'AGENT') return "/dashboard/agent";
    if (user.role === 'TENANT') return "/dashboard/tenant";
    return "/dashboard/owner"; // Default
  };

  const currentMenuItems = useMemo(() => {
    if (!user) return [];
    return MENUS[user.role as keyof typeof MENUS] || MENUS.OWNER;
  }, [user]);

  return (
    <div className={cn("flex flex-col h-full bg-[#0B1120] text-white border-r border-slate-800 relative select-none", className)}>
      
      {/* 1. HEADER LOGO */}
      <div className="h-28 flex items-center justify-center px-4 pt-4 mb-2">
        <Link 
          href={getRootPath()} 
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 shadow-xl backdrop-blur-md group hover:bg-white/10 transition-all duration-300 ring-1 ring-white/5"
        >
            <div className="relative w-10 h-10 shrink-0 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden group-hover:scale-105 transition duration-500">
               <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain p-0.5" />
            </div>   
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight leading-none uppercase italic text-white">
                IMMO<span className="text-orange-500">FACILE</span>
              </span>
              {isLoading ? (
                  <div className="h-2 w-20 bg-slate-700/50 rounded mt-1 animate-pulse" />
              ) : (
                  <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1 group-hover:text-orange-400 transition-colors">
                    {user?.role === 'ADMIN' ? 'SUPER ADMIN' : `${user?.role || 'PRO'} DASHBOARD`}
                  </span>
              )}
            </div>
        </Link>
      </div>

      {/* 2. MENU PRINCIPAL */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        
        {/* SECTION GESTION */}
        <div className="px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-60 pl-1">
                {user?.role === 'ADMIN' ? 'Administration' : 'Gestion'}
            </p>
            
            {isLoading ? (
                <div className="space-y-3">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-10 w-full bg-slate-800/50 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                currentMenuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== getRootPath() && pathname.startsWith(item.href + "/"));
                    return (
                        <Link 
                        key={item.href} 
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative mb-1",
                            isActive 
                            ? "bg-gradient-to-r from-orange-500/20 to-orange-500/5 text-orange-400 font-semibold border border-orange-500/20" 
                            : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent"
                        )}
                        >
                        <item.icon className={cn("w-4 h-4 transition-colors duration-300", isActive ? "text-orange-500" : "text-slate-500 group-hover:text-slate-300")} />
                        <span className="text-sm">{item.label}</span>
                        
                        {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                        )}
                        </Link>
                    );
                })
            )}
        </div>

        {/* SECTION SUPPORT */}
        <div className="px-3 py-2 mt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-60 pl-1">
                Système
            </p>
            {COMMON_ITEMS.map((item) => (
                <Link 
                key={item.href} 
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all mb-1 group"
                >
                    <item.icon className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    <span className="text-sm">{item.label}</span>
                </Link>
            ))}
        </div>
      </div>

      {/* 3. FOOTER PREMIUM */}
      <div className="p-3 bg-black/40 border-t border-slate-800/50 backdrop-blur-xl">
        
        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
            <div className="relative">
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Session Sécurisée</p>
                <p className="text-[8px] text-slate-500 font-mono">Chiffrage SHA-256 actif</p>
            </div>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
            {isLoading ? (
                 <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 rounded-full bg-slate-700 animate-pulse" />
                    <div className="space-y-1">
                        <div className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
                        <div className="h-2 w-10 bg-slate-700 rounded animate-pulse" />
                    </div>
                 </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-orange-500/20 border border-white/10">
                            {user?.name?.substring(0, 2).toUpperCase() || 'IF'}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-white leading-none truncate w-32">
                                {user?.name || 'Utilisateur'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1 group-hover:text-orange-400 transition-colors">
                                {user?.role || 'CLIENT'}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-1 shrink-0"
                        title="Déconnexion"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
