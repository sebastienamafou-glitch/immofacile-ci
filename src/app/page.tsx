"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Menu, X, PlayCircle, Wallet, Bell, PieChart, 
  Banknote, PenTool, Gavel, Lock, Check, CheckCircle, 
  ChevronDown, ShieldCheck, FileSignature, Users, 
  TrendingUp, ArrowRight, Building2
} from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="bg-[#020617] text-slate-300 font-sans selection:bg-[#F59E0B] selection:text-black overflow-x-hidden">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed w-full z-50 top-0 start-0 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#020617]/60">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between p-4">
            
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition duration-300 overflow-hidden">
                    <Image 
                        src="/logo.png" 
                        alt="Logo ImmoFacile"
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="self-center text-lg font-black text-white tracking-tight leading-none">
                        IMMOFACILE<span className="text-[#F59E0B]">.CI</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">Propriétaire</span>
                </div>
            </Link>

            {/* BOUTONS DESKTOP */}
            <div className="flex md:order-2 gap-3">
                <div className="hidden md:flex gap-3">
                    <Link href="/login" className="text-white bg-white/5 hover:bg-white/10 font-bold rounded-xl text-xs px-5 py-2.5 transition border border-white/5 backdrop-blur-sm">
                        Connexion
                    </Link>
                    <Link href="/signup" className="text-[#020617] bg-[#F59E0B] hover:bg-orange-400 font-bold rounded-xl text-xs px-5 py-2.5 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition transform hover:scale-105 flex items-center gap-2">
                         Commencer <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                
                {/* BURGER MOBILE */}
                <button 
                    onClick={toggleMenu}
                    className="inline-flex items-center p-2 w-10 h-10 justify-center text-slate-400 rounded-xl md:hidden hover:bg-white/5 border border-white/5 transition"
                >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* MENU DESKTOP */}
            <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1">
                <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium md:flex-row md:space-x-8 md:mt-0 bg-transparent text-sm">
                    <li><a href="#features" className="block py-2 px-3 text-slate-400 hover:text-white transition">Fonctionnalités</a></li>
                    <li><a href="#security" className="block py-2 px-3 text-slate-400 hover:text-white transition">Sécurité</a></li>
                    <li><a href="#pricing" className="block py-2 px-3 text-slate-400 hover:text-white transition">Tarifs</a></li>
                </ul>
            </div>
        </div>

        {/* MENU MOBILE */}
        {isMenuOpen && (
            <div className="fixed inset-0 z-40 bg-[#020617] pt-24 px-6 md:hidden">
                <ul className="flex flex-col space-y-6 font-bold text-center text-lg">
                    <li><a href="#features" onClick={toggleMenu} className="block py-4 text-slate-300 border-b border-white/5">Fonctionnalités</a></li>
                    <li><a href="#security" onClick={toggleMenu} className="block py-4 text-slate-300 border-b border-white/5">Sécurité</a></li>
                    <li><a href="#pricing" onClick={toggleMenu} className="block py-4 text-slate-300 border-b border-white/5">Tarifs</a></li>
                    <li className="pt-6 flex flex-col gap-4">
                        <Link href="/login" onClick={toggleMenu} className="w-full bg-slate-800 text-white py-4 rounded-2xl border border-slate-700">Connexion</Link>
                        <Link href="/signup" onClick={toggleMenu} className="w-full bg-[#F59E0B] text-black py-4 rounded-2xl shadow-xl font-black">S'inscrire</Link>
                    </li>
                </ul>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Gradients Subtils */}
        <div className="absolute top-0 left-1/2 w-full -translate-x-1/2 h-full z-0 pointer-events-none">
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen"></div>
            <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] mix-blend-screen"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                
                <div className="text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#F59E0B] mb-8 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F59E0B] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        Conforme Loi 2024-1115 (Baux Numériques)
                    </div>
                  
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 text-white">
                        L'Immobilier <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-orange-500">Intelligent.</span>
                    </h1>
                    
                    <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                        Rejoignez 500+ propriétaires. Automatisez l'encaissement des loyers, la génération de contrats et la gestion des incidents.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                        <Link href="/signup" className="px-8 py-4 bg-[#F59E0B] hover:bg-orange-500 text-[#020617] font-black rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.2)] transition transform hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                            Démarrer Gratuitement
                        </Link>
                        <a href="#features" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                            <PlayCircle className="w-5 h-5" /> Démo
                        </a>
                    </div>
                </div>

                {/* --- MOCKUP DASHBOARD RAFFINÉ --- */}
                <div className="relative lg:h-[600px] flex items-center justify-center perspective-[2000px]">
                    {/* Carte principale Dashboard */}
                    <div className="relative w-full max-w-md bg-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl transform rotate-y-6 hover:rotate-y-0 transition duration-700 ease-out group">
                        
                        {/* Header Dashboard */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
                                    <span className="font-bold text-white text-xs">EY</span>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Portefeuille</p>
                                    <p className="font-bold text-white text-sm">Effossou Yannick</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                                <Bell className="w-4 h-4 text-[#F59E0B]" />
                            </div>
                        </div>

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-[#F59E0B] to-orange-700 rounded-2xl p-6 mb-8 shadow-lg relative overflow-hidden group-hover:shadow-orange-500/20 transition-all">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <p className="text-orange-100/80 text-xs font-bold uppercase tracking-widest mb-2">Solde Disponible</p>
                            <h3 className="text-4xl font-black text-white mb-6 tracking-tight">450.000 <span className="text-lg opacity-80 font-medium">FCFA</span></h3>
                            <div className="flex items-center gap-2">
                                <div className="bg-black/20 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                    <TrendingUp className="w-3 h-3" /> +12% vs M-1
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Derniers Mouvements</p>
                            </div>
                            <div className="space-y-3">
                                {/* Item 1 */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Loyer Janvier</p>
                                            <p className="text-[10px] text-slate-500">Appt A4 • Cocody</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400">+150.000</span>
                                </div>
                                {/* Item 2 */}
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                                            <FileSignature className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">Bail Signé</p>
                                            <p className="text-[10px] text-slate-500">M. Amafou</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded">Vérifié</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Badge flottant "Secure" */}
                    <div className="absolute -bottom-8 -left-8 bg-[#020617]/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center gap-4 z-20 hover:border-emerald-500/50 transition-colors">
                         <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                             <ShieldCheck className="w-5 h-5" />
                         </div>
                         <div>
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sécurité Bancaire</p>
                             <p className="text-sm font-black text-white">Chiffrement AES-256</p>
                         </div>
                     </div>
                </div>

            </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-32 bg-[#0B1120]/50 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
                <h2 className="text-3xl lg:text-5xl font-black mb-6 text-white">Gérez comme un Pro</h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">Une suite d'outils complète pour piloter votre patrimoine sans intermédiaire.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#F59E0B]/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-[#F59E0B] mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                        <Banknote className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Paiements Mobiles</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Encaissez via <strong>Wave, Orange Money & MTN</strong>. Les fonds sont sécurisés et virés instantanément sur demande.
                    </p>
                </div>

                {/* Feature 2 */}
                <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                        <PenTool className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Contrats Numériques</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Générez des baux conformes en 2 minutes. Signature électronique par OTP avec <strong>valeur juridique probante</strong>.
                    </p>
                </div>

                {/* Feature 3 */}
                <div className="group bg-[#020617] border border-white/5 p-8 rounded-[2rem] hover:border-[#F59E0B]/30 transition duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-red-400 mb-8 border border-white/10 group-hover:scale-110 transition duration-500">
                        <Gavel className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">Gestion Contentieux</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Un impayé ? Générez une <strong>Mise en Demeure</strong> officielle prête à l'envoi en un clic. Automatisez vos relances.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- SECURITY SECTION (Bank Grade) --- */}
      <section id="security" className="py-32 overflow-hidden bg-[#020617]">
        <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
                
                {/* Visualisation Document */}
                <div className="order-2 lg:order-1 relative flex justify-center">
                    <div className="absolute inset-0 bg-[#F59E0B]/10 rounded-full blur-[100px]"></div>
                    
                    <div className="relative w-full max-w-sm bg-[#0B1120] border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
                        {/* En-tête document */}
                        <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                            <div>
                                <h4 className="text-white font-bold text-sm tracking-widest uppercase">Contrat de Bail</h4>
                                <p className="text-[10px] text-slate-500 mt-1 font-mono">ID: LEASE-884-XJ</p>
                            </div>
                            <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" /> Signé & Scellé
                            </div>
                        </div>

                        {/* Contenu simulé */}
                        <div className="space-y-4 mb-8 opacity-30">
                            <div className="h-2 bg-slate-500 rounded w-3/4"></div>
                            <div className="h-2 bg-slate-500 rounded w-full"></div>
                            <div className="h-2 bg-slate-500 rounded w-5/6"></div>
                            <div className="h-2 bg-slate-500 rounded w-full"></div>
                        </div>

                        {/* Bloc Preuve Numérique */}
                        <div className="bg-[#020617] rounded-xl p-4 border border-white/5 relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 text-[#F59E0B]">
                                <Lock className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Preuve Cryptographique</span>
                            </div>
                            <div className="font-mono text-[9px] text-slate-500 break-all leading-relaxed">
                                0x8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 mb-8 uppercase tracking-widest">
                        <Lock className="w-3 h-3 text-[#F59E0B]" /> Architecture Sécurisée
                    </div>
                    
                    <h2 className="text-4xl lg:text-5xl font-black mb-8 leading-tight text-white">
                        La confiance,<br />
                        <span className="text-[#F59E0B]">c'est mathématique.</span>
                    </h2>
                    
                    <p className="text-slate-400 mb-10 text-lg leading-relaxed">
                        Chaque document est haché (SHA-256) et horodaté. Une fois signé via OTP (SMS), il devient infalsifiable et opposable juridiquement.
                    </p>

                    <div className="space-y-8">
                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                <span className="font-black text-[#F59E0B] text-lg">1</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-white mb-2">Vérification d'Identité (KYC)</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">Analyse automatique des pièces d'identité pour prévenir la fraude documentaire.</p>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                <span className="font-black text-[#F59E0B] text-lg">2</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-white mb-2">Signature OTP Certifiée</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">Validation par code unique envoyé sur le mobile du signataire (Loi 2013-546).</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- APP MOBILE SECTION --- */}
      <section className="py-32 bg-[#0B1120] relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-5xl font-black mb-6 text-white">Votre patrimoine dans la poche.</h2>
            <p className="text-slate-400 mb-16 max-w-2xl mx-auto text-lg">
                Notifications en temps réel, suivi des incidents et comptabilité automatisée.
            </p>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-20">
                
                {/* MOCKUP PHONE RAFFINÉ */}
                <div className="w-full max-w-[320px] relative group perspective-[1000px]">
                     {/* Cadre Téléphone */}
                    <div className="relative mx-auto border-slate-800 bg-slate-900 border-[8px] rounded-[3rem] h-[640px] w-full shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[24px] w-[120px] bg-slate-950 rounded-b-2xl z-20"></div>
                        
                        {/* Écran */}
                        <div className="w-full h-full bg-[#020617] relative flex flex-col overflow-hidden">
                            {/* Status Bar */}
                            <div className="w-full h-12 flex items-end justify-between px-6 pb-2 text-[10px] text-white font-medium z-10">
                                <span>9:41</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 bg-white rounded-full"></div>
                                    <div className="w-3 h-3 bg-white/50 rounded-full"></div>
                                </div>
                            </div>

                            {/* Contenu App */}
                            <div className="p-5 space-y-5 pt-8 overflow-y-auto no-scrollbar">
                                <h3 className="text-white font-black text-2xl">Notifications</h3>
                                
                                <div className="space-y-3">
                                    {/* Notif 1 */}
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Reçu</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500">2m</span>
                                        </div>
                                        <p className="text-sm text-white font-medium leading-snug">Paiement de 150.000 FCFA reçu de M. Kouassi.</p>
                                    </div>

                                    {/* Notif 2 */}
                                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                                                <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-widest">Incident</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500">1h</span>
                                        </div>
                                        <p className="text-sm text-white font-medium leading-snug">Nouvelle fuite d'eau signalée (Appt B2).</p>
                                    </div>
                                    
                                     {/* Notif 3 */}
                                    <div className="bg-slate-800/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md opacity-60">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Info</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Hier</span>
                                        </div>
                                        <p className="text-sm text-white font-medium leading-snug">Votre rapport mensuel est disponible.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Tab Bar */}
                            <div className="mt-auto h-20 bg-slate-900/80 backdrop-blur border-t border-white/5 flex items-center justify-around px-4 pb-4">
                                <div className="p-2 rounded-xl bg-white/10 text-white"><Wallet className="w-5 h-5" /></div>
                                <div className="p-2 rounded-xl text-slate-600"><PieChart className="w-5 h-5" /></div>
                                <div className="p-2 rounded-xl text-slate-600"><Users className="w-5 h-5" /></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-left space-y-6 max-w-sm w-full">
                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition cursor-default">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F59E0B] border border-white/5">
                                <Bell className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-white">Alertes Instantanées</h4>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">Ne courez plus après l'info. Soyez notifié dès qu'un loyer est payé ou qu'un bail est signé.</p>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition cursor-default">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-500 border border-white/5">
                                <PieChart className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-white">Rentabilité Nette</h4>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">Suivez vos revenus et dépenses mois par mois. Exportez vos rapports pour les impôts.</p>
                    </div>
                    
                    <div className="pt-4">
                        <Link href="/signup" className="w-full bg-white text-[#020617] hover:bg-slate-200 font-black py-4 rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2">
                            Créer mon compte <ArrowRight className="w-4 h-4"/>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-32 bg-[#020617] relative">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
                <h2 className="text-3xl lg:text-4xl font-black mb-4 text-white">Tarification Simple</h2>
                <p className="text-slate-400">Pas de frais cachés. Pas d'abonnement mensuel fixe.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Plan Découverte */}
                <div className="bg-[#0B1120] border border-white/5 p-8 rounded-[2rem] hover:border-white/10 transition">
                    <h3 className="text-lg font-bold text-white mb-2">Découverte</h3>
                    <p className="text-3xl font-black text-slate-400 mb-1">0 FCFA</p>
                    <p className="text-xs text-slate-500 mb-8 font-medium uppercase tracking-wide">Pour tester</p>
                    <ul className="space-y-4 text-sm text-slate-300 mb-10">
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> 1 Bien immobilier</li>
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Contrats standards</li>
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Support Email</li>
                    </ul>
                    <Link href="/signup" className="block w-full py-3 rounded-xl border border-white/10 text-center font-bold text-white hover:bg-white/5 transition text-sm">S'inscrire</Link>
                </div>

                {/* Plan Standard (Mis en avant) */}
                <div className="bg-[#0f172a] border border-[#F59E0B] p-8 rounded-[2rem] relative shadow-[0_0_40px_rgba(245,158,11,0.1)] transform md:-translate-y-4">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F59E0B] text-[#020617] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                        Populaire
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Propriétaire</h3>
                    <p className="text-4xl font-black text-[#F59E0B] mb-1">5%</p>
                    <p className="text-xs text-slate-400 mb-8 font-medium uppercase tracking-wide">Par loyer encaissé</p>
                    <ul className="space-y-4 text-sm text-slate-300 mb-10 font-medium">
                        <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Biens illimités</li>
                        <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Paiements Wave/OM</li>
                        <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Signature Électronique</li>
                        <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-[#F59E0B] shrink-0" /> Gestion Incidents</li>
                    </ul>
                    <Link href="/signup" className="block w-full py-4 rounded-xl bg-[#F59E0B] text-[#020617] text-center font-black hover:bg-orange-500 transition shadow-lg text-sm uppercase tracking-wide">Choisir ce plan</Link>
                </div>

                {/* Plan Agence */}
                <div className="bg-[#0B1120] border border-white/5 p-8 rounded-[2rem] hover:border-white/10 transition">
                    <h3 className="text-lg font-bold text-white mb-2">Agence</h3>
                    <p className="text-3xl font-black text-white mb-1">Sur Mesure</p>
                    <p className="text-xs text-slate-500 mb-8 font-medium uppercase tracking-wide">+50 lots</p>
                    <ul className="space-y-4 text-sm text-slate-300 mb-10">
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Multi-comptes</li>
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> API dédiée</li>
                        <li className="flex gap-3"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Marque blanche</li>
                    </ul>
                    <a href="mailto:sales@immofacile.ci" className="block w-full py-3 rounded-xl border border-white/10 text-center font-bold text-white hover:bg-white/5 transition text-sm">Contacter Sales</a>
                </div>
            </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-24 border-t border-white/5 bg-[#020617]">
        <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-black mb-10 text-center text-white">Questions Fréquentes</h2>
            
            <div className="space-y-4">
                <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                    <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                        Comment récupérer mon argent ?
                        <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                    </summary>
                    <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                        Dès qu'un locataire paie, votre solde est crédité. Vous demandez un retrait vers votre numéro Wave ou Orange Money depuis votre dashboard. Le transfert est exécuté instantanément 24/7.
                    </p>
                </details>

                <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                    <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                        Le bail numérique est-il légal ?
                        <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                    </summary>
                    <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                        Oui. La Loi n° 2013-546 reconnaît la signature électronique en Côte d'Ivoire. Nos baux respectent également les plafonds de caution de la Loi de 2019.
                    </p>
                </details>
                
                <details className="group bg-[#0B1120] border border-white/5 rounded-2xl p-6 cursor-pointer open:bg-white/[0.02] transition">
                    <summary className="font-bold flex justify-between items-center text-white list-none text-sm hover:text-[#F59E0B] transition-colors">
                        Qui paie les frais de service ?
                        <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition" />
                    </summary>
                    <p className="text-slate-400 text-sm mt-4 leading-relaxed pl-1">
                        La commission de 5% est déduite du loyer versé par le locataire. C'est le propriétaire qui supporte ce coût pour bénéficier de l'automatisation et de la sécurité, mais il économise les 10% à 15% qu'une agence classique facturerait.
                    </p>
                </details>
            </div>
        </div>
      </section>

      {/* --- FOOTER (AVEC LOGO WEBAPPCI) --- */}
      <footer className="bg-[#020617] border-t border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4">
            
            {/* Colonnes Links */}
            <div className="grid md:grid-cols-4 gap-12 mb-20 border-b border-white/5 pb-16">
                <div className="col-span-1 md:col-span-2 pr-8">
                    <Link href="/" className="text-2xl font-black tracking-tight block mb-6 text-white">
                        IMMOFACILE<span className="text-[#F59E0B]">.CI</span>
                    </Link>
                    <p className="text-slate-500 text-sm max-w-sm leading-relaxed mb-6">
                        La plateforme de référence pour les propriétaires bailleurs en Côte d'Ivoire. Sécurité juridique, paiements mobiles et sérénité d'esprit.
                    </p>
                    <div className="flex gap-4">
                        {/* Social Placeholder */}
                        <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                        <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                        <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"></div>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-[0.2em]">Plateforme</h4>
                    <ul className="space-y-4 text-sm text-slate-400 font-medium">
                        <li><a href="#features" className="hover:text-[#F59E0B] transition">Fonctionnalités</a></li>
                        <li><a href="#security" className="hover:text-[#F59E0B] transition">Sécurité</a></li>
                        <li><a href="#pricing" className="hover:text-[#F59E0B] transition">Tarifs</a></li>
                        <li><Link href="/login" className="hover:text-[#F59E0B] transition flex items-center gap-2">Espace Client <ArrowRight className="w-3 h-3"/></Link></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase text-[10px] tracking-[0.2em]">Légal & Support</h4>
                    <ul className="space-y-4 text-sm text-slate-400 font-medium">
                        <li><Link href="/terms" className="hover:text-[#F59E0B] transition">CGU & Mentions Légales</Link></li>
                        <li><Link href="/privacy" className="hover:text-[#F59E0B] transition">Confidentialité (ARTCI)</Link></li>
                        <li><a href="mailto:support@immofacile.ci" className="hover:text-[#F59E0B] transition">Centre d'aide</a></li>
                    </ul>
                </div>
            </div>
            
            {/* Bottom Footer : Publisher Info */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8">
                
                <p className="text-slate-600 text-xs font-medium">
                    © {new Date().getFullYear()} ImmoFacile. Tous droits réservés.
                </p>

                {/* LOGO ÉDITEUR (WEBAPPCI) */}
                <div className="flex items-center gap-4">
                    <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                        Une solution éditée par
                    </span>
                    <div className="opacity-50 hover:opacity-100 transition-opacity duration-300">
                        <Image 
                            src="/logo2.png" // Le logo WebappCi
                            alt="WebappCi Logo"
                            width={80} // Ajusté pour être discret mais lisible
                            height={30}
                            className="object-contain grayscale hover:grayscale-0 transition-all"
                        />
                    </div>
                </div>

            </div>
        </div>
      </footer>
    </div>
  );
}
