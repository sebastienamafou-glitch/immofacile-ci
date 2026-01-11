"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fermer le menu mobile lors de la navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const noSidebarPages = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];
  const shouldHideSidebar = noSidebarPages.includes(pathname);

  return (
    <div className="flex h-full overflow-hidden">
      {/* --- SIDEBAR DESKTOP --- */}
      {!shouldHideSidebar && (
        <aside className="hidden md:flex w-72 h-full flex-col border-r border-white/5 bg-[#0B1120]/50 backdrop-blur-xl z-20">
          <AppSidebar className="w-full h-full" />
        </aside>
      )}

      {/* --- DRAWER MOBILE --- */}
      {!shouldHideSidebar && (
        <>
          <div 
            className={cn(
              "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
              isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div 
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1120] shadow-2xl transition-transform duration-300 ease-out border-r border-white/10 md:hidden flex flex-col",
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                 <div className="relative w-8 h-8">
                    {/* Assurez-vous d'avoir un logo ou mettez une div de couleur */}
                    <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                 </div>
                 <span className="font-bold text-white tracking-tight">IMMOFACILE</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AppSidebar className="w-full border-none" />
            </div>
          </div>
        </>
      )}
      
      {/* --- ZONE PRINCIPALE --- */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* HEADER MOBILE */}
        {!shouldHideSidebar && (
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0B1120]/80 backdrop-blur-xl sticky top-0 z-30">
            <Link href="/dashboard/owner" className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                <Image src="/logo.png" alt="ImmoFacile" fill className="object-cover" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">ImmoFacile</span>
            </Link>

            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 active:scale-95 transition"
            >
              <Menu size={20} />
            </button>
          </header>
        )}

        {/* CONTENU SCROLLABLE */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar p-0 md:p-0">
           {children}
        </div>
      </main>

      <Toaster position="top-right" theme="dark" />
    </div>
  );
}
