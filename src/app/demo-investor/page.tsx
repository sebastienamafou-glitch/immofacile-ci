'use client';

import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Home, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Bell,
  Search,
  Menu
} from 'lucide-react';

export default function InvestorDashboardDemo() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      {/* --- SIDEBAR --- */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-gray-200 bg-white transition-transform md:translate-x-0">
        <div className="flex h-16 items-center border-b border-gray-100 px-6">
          <span className="text-2xl font-bold text-orange-600">ImmoFacile</span>
        </div>
        <div className="overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {[
              { icon: TrendingUp, label: 'Tableau de bord', active: true },
              { icon: Wallet, label: 'Portefeuille & Finance' },
              { icon: Building2, label: 'Mes Biens (Longue Durée)' },
              { icon: Home, label: 'Mes Annonces (Airbnb)' },
              { icon: AlertCircle, label: 'Incidents & Travaux', badge: '1' },
            ].map((item, idx) => (
              <li key={idx}>
                <a
                  href="#"
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${item.active ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-600">
                      {item.badge}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 px-6">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Mes Agences
            </h3>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white font-bold text-xs">
                PC
              </div>
              <div>
                <p className="text-sm font-semibold">Prestige Capital</p>
                <p className="text-xs text-slate-500">Géré par ImmoFacile</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="md:ml-64">
        
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button className="text-slate-500 hover:text-slate-700 md:hidden">
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un bien, un locataire..." 
                className="h-9 w-64 rounded-full border border-gray-200 bg-gray-50 pl-9 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="h-5 w-5" />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">M. Investisseur</p>
                <p className="text-xs text-slate-500">Business Angel</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-400 to-red-500" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vue d'ensemble</h1>
              <p className="text-sm text-slate-500">Bienvenue sur votre espace de pilotage ImmoFacile.</p>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/10 hover:bg-gray-50">
                <Download className="mr-2 h-4 w-4" />
                Rapport Fiscal
              </button>
              <button className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
                + Nouveau Bien
              </button>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Wallet Card - The WOW Effect */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Solde Disponible</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">2.500.000 <span className="text-lg font-normal text-slate-500">FCFA</span></p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="flex items-center text-green-600 font-medium">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  +12.5%
                </span>
                <span className="ml-2 text-slate-500">vs mois dernier</span>
              </div>
            </div>

            {/* Properties Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Parc Immobilier</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">2 <span className="text-lg font-normal text-slate-500">Biens</span></p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                1 Villa (Locatif) • 1 Loft (Airbnb)
              </div>
            </div>

            {/* Occupancy Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Taux d'occupation</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">100%</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                Tous vos biens génèrent du revenu.
              </div>
            </div>
            
             {/* Incident Card */}
             <div className="rounded-xl border border-red-100 bg-red-50 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Maintenance</p>
                  <p className="mt-2 text-3xl font-bold text-red-900">1 <span className="text-lg font-normal text-red-700">Alerte</span></p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
                  <AlertCircle className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-sm text-red-700 font-medium">
                Fuite d'eau - Villa Cocody
              </div>
            </div>
          </div>

          {/* SPLIT VIEW: TRANSACTIONS & PROPERTIES */}
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            
            {/* Recent Transactions (Fintech aspect) */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-slate-900">Transactions Récentes</h2>
                <button className="text-sm font-medium text-orange-600 hover:text-orange-700">Tout voir</button>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Transaction 1 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Loyer - Villa Cocody</p>
                        <p className="text-sm text-slate-500">Via Wave • Aujourd'hui à 09:42</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">+ 1.500.000 FCFA</span>
                  </div>
                  
                  {/* Transaction 2 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Payout Airbnb - Réservation #BK99</p>
                        <p className="text-sm text-slate-500">Virement • Hier à 14:20</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">+ 135.000 FCFA</span>
                  </div>

                   {/* Transaction 3 */}
                   <div className="flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Frais de Gestion (5%)</p>
                        <p className="text-sm text-slate-500">Prélèvement auto • Hier</p>
                      </div>
                    </div>
                    <span className="font-medium text-slate-600">- 75.000 FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Active Incidents */}
            <div className="space-y-6">
              
              {/* Incident Alert */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">Intervention requise</h2>
                </div>
                <div className="p-6">
                  <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Fuite Climatiseur Salon</p>
                      <p className="text-xs text-red-700">Villa Duplex Cocody</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Devis Artisan :</span>
                      <span className="font-medium text-slate-900">25.000 FCFA</span>
                    </div>
                    <button className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                      Valider le devis
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50">
                      Voir les détails
                    </button>
                  </div>
                </div>
              </div>

              {/* Promo Card (Cross sell) */}
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-lg">
                <h3 className="font-bold text-lg">Devenez Super Host 🌟</h3>
                <p className="mt-2 text-sm text-orange-100">
                  Optimisez vos revenus court séjour avec notre nouveau module de pricing dynamique.
                </p>
                <button className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm hover:bg-orange-50">
                  Activer maintenant
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
