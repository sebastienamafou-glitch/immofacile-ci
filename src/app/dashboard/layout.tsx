"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
// ✅ IMPORT DU RADAR
import NotificationBell from "@/components/shared/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      
      {/* --- 1. SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r border-white/5 bg-[#0B1120]">
        <AppSidebar className="h-full w-full" />
      </aside>

      {/* --- 2. ZONE PRINCIPALE --- */}
      <div className="flex-1 flex flex-col md:pl-72 min-h-screen transition-all duration-300">
        
        {/* A. HEADER MOBILE (Modifié) */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0B1120]/90 backdrop-blur-lg border-b border-white/5">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain p-0.5" />
                </div>
                <span className="font-bold text-white tracking-tight">ImmoFacile</span>
            </Link>

            <div className="flex items-center gap-4">
                {/* ✅ CLOCHE MOBILE */}
                <NotificationBell />
                
                <button 
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 -mr-2 text-slate-300 hover:text-white active:scale-95 transition-transform"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </header>

        {/* B. HEADER DESKTOP (Nouveau : Pour afficher la cloche sur grand écran) */}
        <header className="hidden md:flex items-center justify-end px-8 py-4 bg-[#0B1120]/50 backdrop-blur border-b border-white/5 sticky top-0 z-30">
            <div className="flex items-center gap-6">
                {/* ✅ CLOCHE DESKTOP */}
                <NotificationBell />
                
                {/* (Optionnel) Avatar Utilisateur ici plus tard */}
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                    MO
                </div>
            </div>
        </header>

        {/* C. CONTENU DE LA PAGE */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {children}
        </main>
      </div>

      {/* --- 3. MENU MOBILE (DRAWER) --- */}
      <div 
        className={cn(
            "fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div 
        className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1120] shadow-2xl transition-transform duration-300 ease-out md:hidden flex flex-col border-r border-white/10",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Menu</span>
            <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            <AppSidebar className="border-none" />
        </div>
      </div>

    </div>
  );
}
