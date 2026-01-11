"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Fermeture automatique du menu lors d'un changement de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#060B18]">
      
      {/* --- 1. SIDEBAR DESKTOP (Fixe à gauche, cachée sur mobile) --- */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r border-white/5 bg-[#0B1120]">
        <AppSidebar className="h-full w-full" />
      </aside>

      {/* --- 2. ZONES PRINCIPALES --- */}
      <div className="flex-1 flex flex-col md:pl-72 min-h-screen transition-all duration-300">
        
        {/* HEADER MOBILE (Visible uniquement sur petits écrans) */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0B1120]/90 backdrop-blur-lg border-b border-white/5">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain p-0.5" />
                </div>
                <span className="font-bold text-white tracking-tight">ImmoFacile</span>
            </Link>

            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -mr-2 text-slate-300 hover:text-white active:scale-95 transition-transform"
                aria-label="Ouvrir le menu"
            >
                <Menu className="w-6 h-6" />
            </button>
        </header>

        {/* CONTENU DE LA PAGE */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {children}
        </main>
      </div>

      {/* --- 3. MENU MOBILE (DRAWER / OVERLAY) --- */}
      
      {/* Fond sombre cliquable */}
      <div 
        className={cn(
            "fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden",
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Le Panneau Latéral Mobile */}
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
            {/* On réutilise le composant Sidebar existant */}
            <AppSidebar className="border-none" />
        </div>
      </div>

    </div>
  );
}
