"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Palmtree, Building2, ChevronDown, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="fixed w-full z-50 top-0 start-0 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#020617]/60">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition duration-300 overflow-hidden">
                  <Image src="/logo.png" alt="Logo Babimmo" width={32} height={32} className="object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="self-center text-lg font-black text-white tracking-tight leading-none">
                      BABIMMO<span className="text-[#F59E0B]">.CI</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase flex items-center gap-1">
                      <ShieldCheck className="w-2 h-2 text-emerald-500" /> L'immobilier Facile
                  </span>
              </div>
          </Link>

          {/* BOUTONS DESKTOP & ESPACE B2C */}
          <div className="flex md:order-2 gap-4 items-center">
              <div className="hidden md:flex items-center gap-5">
                  
                  {/* DROPDOWN PARCOURIR LES BIENS (B2C & ACHETEURS) */}
                  <div className="relative group py-2">
                      <button className="text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 transition uppercase tracking-wide">
                          Nos Biens <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                      </button>
                      <div className="absolute right-0 top-full mt-0 w-64 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col p-2">
                          
                          {/* Lien Vente (Nouveau) */}
                          <Link href="/sales" className="flex items-center gap-3 px-3 py-3 hover:bg-orange-500/10 rounded-lg text-xs font-bold text-orange-400 transition">
                              <ShieldCheck className="w-4 h-4" />
                              <div className="flex flex-col">
                                  <span>Acheter un bien</span>
                                  <span className="text-[9px] text-orange-500/70 font-normal mt-0.5">Terrains & Villas vérifiés (ACD)</span>
                              </div>
                          </Link>

                          <div className="h-px w-full bg-white/5 my-1"></div>

                          {/* Lien Location */}
                          <Link href="/properties" className="flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-lg text-xs font-bold text-white transition">
                              <Building2 className="w-4 h-4 text-slate-400" /> 
                              <div className="flex flex-col">
                                  <span>Louer un logement</span>
                                  <span className="text-[9px] text-slate-500 font-normal mt-0.5">Baux longue durée sécurisés</span>
                              </div>
                          </Link>

                          {/* Lien Akwaba */}
                          <Link href="/akwaba" className="flex items-center gap-3 px-3 py-3 hover:bg-emerald-500/10 rounded-lg text-xs font-bold text-emerald-400 transition">
                              <Palmtree className="w-4 h-4" />
                              <div className="flex flex-col">
                                  <span>Séjours Akwaba</span>
                                  <span className="text-[9px] text-emerald-500/70 font-normal mt-0.5">Courte durée & Vacances</span>
                              </div>
                          </Link>
                      </div>
                  </div>

                  <div className="w-px h-4 bg-white/10"></div> {/* Séparateur */}

                  {/* B2B ACTIONS */}
                  <Link href="/login" className="text-white hover:text-[#F59E0B] font-bold text-xs transition">
                      Connexion
                  </Link>
                  <Link href="/signup" className="text-[#020617] bg-[#F59E0B] hover:bg-orange-400 font-black rounded-xl text-xs px-5 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition transform hover:scale-105 flex items-center gap-2 uppercase tracking-wide">
                       Créer mon compte <ArrowRight className="w-3 h-3" />
                  </Link>
              </div>
              
              {/* BURGER MOBILE */}
              <button onClick={toggleMenu} className="inline-flex items-center p-2 w-10 h-10 justify-center text-slate-400 rounded-xl md:hidden hover:bg-white/5 border border-white/5 transition">
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
          </div>

          {/* MENU DESKTOP (ARGUMENTS SaaS B2B) */}
          <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1">
              <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium md:flex-row items-center md:space-x-8 md:mt-0 bg-transparent text-sm">
                 <li><a href="#features" className="block py-2 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wide">Fonctionnalités</a></li>
                 <li><a href="#security" className="block py-2 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wide">Sécurité Légale</a></li>
                 <li><a href="#pricing" className="block py-2 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wide">Tarifs</a></li>
              </ul>
          </div>
      </div>

      {/* MENU MOBILE */}
      {isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-[#020617] pt-24 px-6 md:hidden overflow-y-auto pb-10">
              <ul className="flex flex-col space-y-6 font-bold text-center text-lg">
                  
                  {/* Section Propriétaires (B2B) */}
                  <li className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2">Espace Propriétaire</li>
                  <li><a href="#features" onClick={toggleMenu} className="block py-3 text-slate-300 border-b border-white/5">Fonctionnalités SaaS</a></li>
                  <li><a href="#security" onClick={toggleMenu} className="block py-3 text-slate-300 border-b border-white/5">Sécurité & Loi</a></li>
                  <li><a href="#pricing" onClick={toggleMenu} className="block py-3 text-slate-300 border-b border-white/5">Tarifs</a></li>
                  
                  <li className="pt-4 flex flex-col gap-4">
                      <Link href="/login" onClick={toggleMenu} className="w-full bg-slate-800 text-white py-4 rounded-2xl border border-slate-700">Connexion</Link>
                      <Link href="/signup" onClick={toggleMenu} className="w-full bg-[#F59E0B] text-black py-4 rounded-2xl shadow-xl font-black uppercase">Créer mon compte</Link>
                  </li>

                  {/* Section Acheteurs & Locataires (B2C) */}
                  <li className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-8 mb-2">Vous cherchez un bien ?</li>
                  <li>
                      <Link href="/sales" onClick={toggleMenu} className="flex items-center justify-center gap-2 py-4 text-orange-400 border-b border-white/5 bg-orange-400/5 rounded-xl">
                          <ShieldCheck className="w-5 h-5" /> Acheter en sécurité (ACD)
                      </Link>
                  </li>
                  <li>
                      <Link href="/properties" onClick={toggleMenu} className="flex items-center justify-center gap-2 py-4 text-white border-b border-white/5 bg-white/5 rounded-xl mt-2">
                          <Building2 className="w-5 h-5" /> Locations Classiques
                      </Link>
                  </li>
                  <li>
                      <Link href="/akwaba" onClick={toggleMenu} className="flex items-center justify-center gap-2 py-4 text-emerald-400 border-b border-white/5 bg-emerald-500/5 rounded-xl mt-2">
                          <Palmtree className="w-5 h-5" /> Séjours Akwaba
                      </Link>
                  </li>
              </ul>
          </div>
      )}
    </nav>
  );
}
