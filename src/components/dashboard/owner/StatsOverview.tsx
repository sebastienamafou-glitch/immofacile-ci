"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, TrendingUp, TrendingDown, DollarSign, Activity, PieChart, ShieldAlert } from "lucide-react"; 
import Swal from 'sweetalert2';
import { api } from "@/lib/api"; 
import FinanceChart from "./FinanceChart";

// ✅ Interfaces alignées sur le payload réel de route.ts
interface DashboardUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  walletBalance: number;
  isVerified: boolean;
}

interface DashboardStats {
  totalProperties: number;
  occupancyRate: number;
  monthlyIncome: number;
  activeIncidentsCount: number;
  totalExpenses: number; 
  netIncomeYTD: number;  
}

interface DashboardProperty {
    id: string;
    title: string;
    address: string;
    isPublished: boolean;
    price: number;
    commune: string;
    images: string[];
    bedrooms: number;
    bathrooms: number;
    surface: number | null;
    type: string;
    isAvailable?: boolean;
}

interface StatsProps {
  user: DashboardUser; 
  stats: DashboardStats; 
  properties: DashboardProperty[]; 
  onWithdraw?: () => void; // Rendu optionnel pour ne pas casser page.tsx, mais inutilisé ici.
  onRefresh?: () => void;
}

export default function StatsOverview({ user, stats, properties, onRefresh }: StatsProps) {
  const router = useRouter();

  // --- MODALE RECHARGEMENT HYBRIDE ---
  const handleRecharge = async () => {
    const { value: formValues, isDismissed } = await Swal.fire({
      title: 'Recharger mon Portefeuille',
      html: `
        <div class="text-left font-sans space-y-4 mt-4">
            <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-xs text-blue-200">
                Ce portefeuille sert exclusivement à payer vos artisans ou honoraires de plateforme.
            </div>
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Montant à recharger (FCFA)</label>
                <input id="swal-topup-amt" type="number" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-emerald-500 font-mono" placeholder="Ex: 50000">
            </div>
            <div>
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Numéro Wave / Orange Money</label>
                <input id="swal-topup-phone" type="tel" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-emerald-500 font-mono" placeholder="0700000000">
            </div>
        </div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: 'Procéder au paiement', confirmButtonColor: '#10B981', cancelButtonText: 'Annuler',
      background: '#0B1120', color: '#fff',
      customClass: { popup: 'border border-white/10 rounded-[2rem] p-8' },
      preConfirm: () => {
        const amount = parseInt((document.getElementById('swal-topup-amt') as HTMLInputElement).value, 10);
        const phone = (document.getElementById('swal-topup-phone') as HTMLInputElement).value;
        if (!amount || amount < 100) Swal.showValidationMessage('Montant minimum : 100 FCFA');
        if (!phone || !/^(01|05|07)\d{8}$/.test(phone)) Swal.showValidationMessage('Format ivoirien invalide (10 chiffres)');
        return { amount, phone };
      }
    });

    if (!isDismissed && formValues) {
        try {
            Swal.fire({
                title: 'Initialisation...',
                text: 'Connexion au serveur de paiement sécurisé',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                background: '#0B1120', color: '#fff'
            });

            // Appel à ton API hybride (Simulera CinetPay en local)
            const res = await api.post('/payment/initiate', {
                type: 'TOPUP',
                manualAmount: formValues.amount,
                referenceId: user.id, // On utilise l'ID du user comme référence pour un TopUp
                idempotencyKey: crypto.randomUUID(),
                phone: formValues.phone
            });

            if (res.data.success && res.data.paymentUrl) {
                window.location.href = res.data.paymentUrl;
            } else {
                throw new Error("URL de paiement non reçue");
            }

        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Erreur', text: error.response?.data?.error || "Impossible d'initier le rechargement.", background: '#0B1120', color: '#fff' });
        }
    }
  };

  // --- MODALE DÉPENSES ---
  const handleAddExpense = async () => {
    if (!properties || properties.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Aucun bien', text: 'Ajoutez d\'abord une propriété.', background: '#0F172A', color: '#fff' });
        return;
    }
    
    const optionsHtml = properties.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    
    const { value: formValues } = await Swal.fire({
        title: 'Enregistrer une Dépense',
        html: `
            <div class="space-y-4 text-left font-sans mt-4">
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Propriété concernée</label>
                    <div class="relative mt-1">
                        <select id="swal-prop" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition appearance-none">${optionsHtml}</select>
                        <div class="absolute right-4 top-3.5 text-slate-500 pointer-events-none">▼</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Type</label>
                        <select id="swal-cat" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-red-500 transition">
                            <option value="REPARATION">Réparation</option>
                            <option value="TAXE">Impôts / Taxes</option>
                            <option value="ASSURANCE">Assurance</option>
                            <option value="AUTRE">Autre</option>
                        </select>
                    </div>
                    <div>
                         <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Montant (FCFA)</label>
                         <input id="swal-amt" type="number" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-red-500 font-mono" placeholder="0">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Description</label>
                    <input id="swal-desc" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mt-1 outline-none focus:border-red-500" placeholder="Ex: Remplacement robinet cuisine">
                </div>
            </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'Valider la dépense', confirmButtonColor: '#EF4444', cancelButtonText: 'Annuler',
        background: '#0B1120', color: '#fff',
        customClass: { popup: 'border border-white/10 rounded-[2rem] p-8' },
        preConfirm: () => ({
            propertyId: (document.getElementById('swal-prop') as HTMLSelectElement).value,
            category: (document.getElementById('swal-cat') as HTMLSelectElement).value,
            description: (document.getElementById('swal-desc') as HTMLInputElement).value,
            amount: (document.getElementById('swal-amt') as HTMLInputElement).value,
        })
    });

    if (formValues) {
        try {
            await api.post('/owner/expenses', formValues);
            
            Swal.fire({ 
                icon: 'success', title: 'Dépense ajoutée', 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
                background: '#10B981', color: '#fff' 
            });

            if (onRefresh) {
                onRefresh();
            } else {
                router.refresh();
            }

        } catch (e) { 
            Swal.fire({ icon: 'error', title: 'Erreur', text: "Impossible d'ajouter la dépense.", background: '#1e293b', color: '#fff' }); 
        }
    }
  };

  return (
    <div className="space-y-8 fade-in">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Vue d'ensemble</h2>
            <p className="text-slate-500 text-xs font-bold">Performance financière en temps réel</p>
         </div>
         <div className="flex gap-3">
             <button 
                onClick={handleAddExpense} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition active:scale-95"
             >
                <TrendingDown className="w-4 h-4" /> Nouvelle Dépense
             </button>
             
             <button 
                onClick={handleRecharge} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition active:scale-95"
             >
                <Plus className="w-4 h-4" /> Recharger
             </button>
         </div>
      </div>

      {/* --- GRILLE PRINCIPALE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. GRAPHIQUE */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-indigo-500" /> Flux de Trésorerie
                </h3>
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-slate-500 px-3 py-1 rounded-full bg-slate-950 border border-white/5">Annuel</span>
                </div>
            </div>
            <div className="h-64 w-full"> 
                <FinanceChart stats={stats} /> 
            </div>
        </div>

        {/* 2. CARTE WALLET (Refondue en Portefeuille de Charges) */}
        <div className="lg:col-span-1 h-auto min-h-[320px] p-8 bg-gradient-to-bl from-orange-400 to-orange-600 rounded-[2rem] shadow-2xl shadow-orange-500/20 text-white relative overflow-hidden flex flex-col justify-between group transform hover:-translate-y-1 transition duration-500">
            
            {/* Effets de fond */}
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-noise"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition duration-1000"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-inner">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <span className="px-3 py-1 bg-black/20 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
                        Portefeuille de charges
                    </span>
                </div>

                <div>
                    <p className="text-orange-100/80 text-xs font-bold uppercase tracking-widest mb-1">Fonds en Transit (Top-Ups)</p>
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter text-white drop-shadow-lg truncate">
                        {user?.walletBalance?.toLocaleString('fr-FR') || 0}
                        <span className="text-2xl text-orange-200/90 ml-1">F</span>
                    </h2>
                </div>
            </div>

            {/* Avertissement Légal de Transparence */}
            <div className="relative z-10 mt-6 bg-black/15 border border-white/10 rounded-xl p-4 backdrop-blur-sm shadow-inner">
                <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-orange-200 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium leading-relaxed text-orange-50">
                        <strong className="text-white uppercase tracking-wider block mb-1">Transparence Totale</strong>
                        Vos revenus locatifs et cautions sont virés <strong>directement</strong> sur votre compte Mobile Money personnel (Split Payment). Ce portefeuille sert uniquement à provisionner vos artisans.
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* 3. KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* KPI Revenus */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-emerald-500/30 transition duration-300">
            <div className="absolute top-0 right-0 p-16 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <DollarSign className="w-5 h-5" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" /> Revenus
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Revenu Mensuel Est.</p>
                <p className="text-3xl font-black text-white">{stats?.monthlyIncome?.toLocaleString('fr-FR') || 0} <span className="text-sm font-medium text-slate-600">F</span></p>
            </div>
          </div>

          {/* KPI Propriétés */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition duration-300">
            <div className="absolute top-0 right-0 p-16 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <PieChart className="w-5 h-5" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                    Parc
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Biens</p>
                <p className="text-3xl font-black text-white">{stats?.totalProperties || 0} <span className="text-sm font-medium text-slate-600">Unités</span></p>
            </div>
          </div>

          {/* KPI Incidents/Occupation */}
          <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-red-500/30 transition duration-300">
            <div className="absolute top-0 right-0 p-16 bg-red-500/5 blur-3xl rounded-full group-hover:bg-red-500/10 transition"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                    <Activity className="w-5 h-5" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                    Occ. {stats?.occupancyRate || 0}%
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Incidents Actifs</p>
                <p className="text-3xl font-black text-red-400">{stats?.activeIncidentsCount || 0}</p>
            </div>
          </div>
      </div>

    </div>
  );
}
