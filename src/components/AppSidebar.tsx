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
  ShieldCheck, Receipt, Briefcase, Landmark, Server, CalendarCheck, CalendarDays, Building2,
  MessageCircle, Heart, Compass, Map as MapIcon, LucideIcon, Palmtree, TrendingUp,
  FileSignature,
} from "lucide-react";

// 1. DÉFINITION DU TYPE
type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

// --- 2. DÉFINITION DYNAMIQUE DES MENUS ---
const MENUS: Record<string, MenuItem[]> = {
  OWNER: [
    { icon: LayoutDashboard, label: "Vue d'ensemble", href: "/dashboard/owner" },
    { icon: Building2, label: "Mon Agence", href: "/dashboard/owner/agency" },
    { icon: CalendarDays, label: "Planning Global", href: "/dashboard/owner/akwaba/calendar" },
    { icon: Key, label: "Mes Propriétés", href: "/dashboard/owner/properties" },
    { icon: Users, label: "Mes Locataires", href: "/dashboard/owner/tenants" },
    { icon: UserCheck, label: "Candidatures", href: "/dashboard/owner/candidates" },
    { icon: FileText, label: "Baux & Contrats", href: "/dashboard/owner/leases" },
    { icon: ShieldCheck, label: "Conformité & Juridique", href: "/dashboard/owner/compliance" },
    { icon: ClipboardList, label: "États des lieux", href: "/dashboard/owner/inventory" },
    { icon: Hammer, label: "Maintenance", href: "/dashboard/owner/maintenance" },
    { icon: Wallet, label: "Mes Finances", href: "/dashboard/owner/finance" },
    { icon: FileText, label: "Mon bilan", href: "/dashboard/owner/finance/tax" },
  
  ],
  TENANT: [
    { icon: LayoutDashboard, label: "Mon Espace", href: "/dashboard/tenant" },
    { icon: Receipt, label: "Mes Paiements", href: "/dashboard/tenant/payments" },
    { icon: FileText, label: "Mon Contrat", href: "/dashboard/tenant/contract" },
    { icon: Shield, label: "Signaler Incident", href: "/dashboard/tenant/incidents" },
 
  ],
  AGENT: [
    { icon: LayoutDashboard, label: "Tableau de Bord", href: "/dashboard/agent" }, 
    { icon: MapPin, label: "Missions & Marché", href: "/dashboard/agent/visits" }, 
    { icon: ClipboardCheck, label: "Dossiers Locataires", href: "/dashboard/agent/files" }, 
    { icon: Key, label: "Biens sous Gestion", href: "/dashboard/agent/properties" },
    { icon: Key, label: "Conciergerie", href: "/dashboard/agent/akwaba" },
 
  ],
  ARTISAN: [
    { icon: LayoutDashboard, label: "Mes Missions", href: "/dashboard/artisan" },
    { icon: CalendarCheck, label: "Planning", href: "/dashboard/artisan/schedule" },
    { icon: Wallet, label: "Facturation", href: "/dashboard/artisan/finance" },
    { icon: Settings, label: "Disponibilité", href: "/dashboard/artisan/profile" },
  
  ],
  SUPER_ADMIN: [
    { icon: Server, label: "Command Center", href: "/dashboard/superadmin" }, 
    { icon: Users, label: "Utilisateurs", href: "/dashboard/superadmin/users" },
    { icon: TrendingUp, label: "Actionnaires", href: "/dashboard/superadmin/investors/new" },
    { icon: Key, label: "Parc Immobilier", href: "/dashboard/superadmin/properties" },
    { icon: Wallet, label: "Finances Globales", href: "/dashboard/superadmin/finance" }, 
    { icon: Briefcase, label: "Agents", href: "/dashboard/superadmin/agents" },
    { icon: Hammer, label: "Artisans", href: "/dashboard/superadmin/artisans" }, 
    { icon: ShieldCheck, label: "KYC & Sécurité", href: "/dashboard/superadmin/kyc" },
    { icon: ScrollText, label: "Journal d'Audit", href: "/dashboard/superadmin/logs" },
    { icon: Landmark, label: "Trésorerie", href: "/dashboard/superadmin/treasury" },
     { icon: ShieldCheck, label: "Conformité & Juridique", href: "/dashboard/owner/compliance" },
  ],
  AGENCY_ADMIN: [
    { icon: LayoutDashboard, label: "Agence Dashboard", href: "/dashboard/agency" },
    { icon: Users, label: "Mon Équipe", href: "/dashboard/agency/team" },
    { icon: Building2, label: "Biens Gérés", href: "/dashboard/agency/properties" },
    { icon: FileSignature, label: "Gestion Baux (Mandat)", href: "/dashboard/agency/contracts" }, 
    { icon: Palmtree, label: "Locations Saisonnières", href: "/dashboard/agency/listings" },
    { icon: Wallet, label: "Portefeuille", href: "/dashboard/agency/wallet" },
    { icon: Settings, label: "Paramètres Agence", href: "/dashboard/agency/settings" },
   
  ],
  GUEST: [
    { icon: Compass, label: "Explorer", href: "/dashboard/guest" },
    { icon: MapIcon, label: "Mes Voyages", href: "/dashboard/guest/trips" },
    { icon: Heart, label: "Favoris", href: "/dashboard/guest/favorites" },
    { icon: MessageCircle, label: "Messages", href: "/dashboard/guest/inbox" },
    { icon: FileText, label: "Historique", href: "/dashboard/guest/history" },
    
  ],
};

const COMMON_ITEMS: MenuItem[] = [
  { icon: LifeBuoy, label: "Centre d'aide", href: "/dashboard/help" },
  { icon: Settings, label: "Paramètres", href: "/dashboard/settings" },
  
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. SÉCURITÉ & CHARGEMENT ---
  useEffect(() => {
    // Vérification stricte
    const checkAuth = () => {
        try {
            const storedUser = localStorage.getItem('immouser');
            if (!storedUser) {
                console.warn("⛔️ Accès refusé : Aucun utilisateur connecté.");
                // Redirection forcée vers l'inscription/connexion
                router.replace('/login'); 
                return;
            }
            setUser(JSON.parse(storedUser));
        } catch(e) {
            console.error("Erreur lecture session", e);
            router.replace('/login');
        } finally {
            setIsLoading(false);
        }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('immouser');
    // Suppression cookies (Best practice)
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push('/login');
  };

  const getRootPath = () => {
    if (!user) return "/login";
    // Mapping des dashboards par défaut selon le rôle
    switch (user.role) {
        case 'SUPER_ADMIN': return "/dashboard/superadmin";
        case 'AGENT': return "/dashboard/agent";
        case 'TENANT': return "/dashboard/tenant";
        case 'ARTISAN': return "/dashboard/artisan";
        case 'GUEST': return "/dashboard/guest";
        case 'AGENCY_ADMIN': return "/dashboard/agency";
        default: return "/dashboard/owner";
    }
  };

  const currentMenuItems = useMemo(() => {
    if (!user || !user.role) return [];
    const roleMenu = MENUS[user.role as keyof typeof MENUS];
    return roleMenu || []; 
  }, [user]);

  // --- 2. UI : PROTECTION CONTRE LE FLASH ---
  // Si on charge ou si pas d'user, on n'affiche PAS la vraie sidebar
  if (isLoading || !user) {
      return (
        <div className={cn("flex flex-col h-full bg-[#0B1120] text-white border-r border-slate-800 p-4", className)}>
            <div className="h-20 bg-slate-800/50 rounded-2xl animate-pulse mb-8" />
            <div className="space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-full bg-slate-800/30 rounded-xl animate-pulse" />)}
            </div>
        </div>
      );
  }

  // --- 3. RENDER NORMAL (Connecté) ---
  return (
    <div className={cn("flex flex-col h-full bg-[#0B1120] text-white border-r border-slate-800 relative select-none", className)}>
      
      {/* HEADER LOGO */}
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
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1 group-hover:text-orange-400 transition-colors">
                {user.role} SPACE
              </span>
            </div>
        </Link>
      </div>

      {/* MENU DYNAMIQUE */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-60 pl-1">
                Menu Principal
            </p>
            
            {currentMenuItems.length > 0 ? (
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
            ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 text-xs">Rôle non reconnu ({user.role})</p>
                </div>
            )}
        </div>

        {/* SUPPORT */}
        <div className="px-3 py-2 mt-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-60 pl-1">Système</p>
            {COMMON_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all mb-1 group">
                    <item.icon className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    <span className="text-sm">{item.label}</span>
                </Link>
            ))}
        </div>
      </div>

      {/* FOOTER PROFILE */}
      <div className="p-3 bg-black/40 border-t border-slate-800/50 backdrop-blur-xl">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors group">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.name?.substring(0, 2).toUpperCase() || 'IF'}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-bold text-white leading-none truncate w-28">
                        {user.name}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-1">{user.role}</span>
                </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}
