"use client";

import { Suspense } from "react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, CalendarDays, Wallet, MinusCircle, Phone, 
  Hotel, Key, ArrowRight, ShieldCheck, UserCheck 
} from "lucide-react";
import Swal from 'sweetalert2'; 
import { api } from "@/lib/api"; 

import { useDashboardData } from "@/hooks/useDashboardData";
import { useTenantAlert } from "@/hooks/useTenantAlert";
import StatsOverview from "@/components/dashboard/owner/StatsOverview";
import PropertiesGrid from "@/components/dashboard/owner/PropertiesGrid";
import TenantsList from "@/components/dashboard/owner/TenantsList";
import DocumentsList from "@/components/dashboard/owner/DocumentsList";
import IncidentWidget from "@/components/dashboard/owner/IncidentsWidget";

// --- 1. COMPOSANTS UTILITAIRES & WIDGETS ---

const ErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <AlertTriangle className="w-8 h-8 text-red-500" />
    </div>
    <h3 className="text-xl font-bold text-white">Une erreur est survenue</h3>
    <p className="text-slate-400 text-sm max-w-md text-center">{message}</p>
    <button 
      onClick={onRetry}
      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-4 py-2 rounded-xl font-bold text-xs transition"  
    >
      <MinusCircle className="w-4 h-4" /> Réessayer
    </button>
  </div>
);

const PremiumLoader = () => (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center gap-4">
        <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-800 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-t-orange-500 rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Chargement ImmoFacile...</p>
    </div>
);

// ✅ NOUVEAU WIDGET KYC PROPRIÉTAIRE
const OwnerKycWidget = ({ isVerified }: { isVerified: boolean }) => {
  // Si déjà vérifié, on n'affiche pas ce bloc pour gagner de la place (ou on affiche un badge discret)
  if (isVerified) return (
    <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
        <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
            <p className="text-sm font-bold text-white">Profil Vérifié</p>
            <p className="text-[10px] text-emerald-400 font-medium">Votre identité est confirmée.</p>
        </div>
    </div>
  );

  return (
    <div className="mb-8 p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl relative overflow-hidden group transition hover:scale-[1.02]">
        <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex items-center justify-center border w-10 h-10 bg-white/10 rounded-xl backdrop-blur-md border-white/10">
                <UserCheck className="w-5 h-5 text-indigo-200" />
            </div>
            <span className="bg-indigo-900/50 border border-indigo-400/30 text-indigo-200 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                Requis
            </span>
        </div>

        <h4 className="relative z-10 text-xl font-black tracking-tight mb-2">Vérification d'Identité</h4>
        <p className="relative z-10 text-xs font-medium leading-relaxed mb-6 text-indigo-100/80">
            Obligatoire pour publier des annonces et sécuriser vos revenus locatifs.
        </p>

        <Link href="/dashboard/owner/kyc" className="relative z-10 block">
            <button className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                <ShieldCheck className="w-4 h-4" />
                Vérifier mon profil
            </button>
        </Link>
    </div>
  );
};

// LISTE DES RÉSERVATIONS AKWABA
const AkwabaBookingsList = ({ bookings }: { bookings: any[] }) => {
  if (!bookings || bookings.length === 0) return (
    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
        <Hotel className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500 font-bold">Aucune arrivée prévue</p>
    </div>
  );

  return (
    <div className="space-y-3">
        {bookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 rounded-xl hover:border-purple-500/30 transition group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Key size={16} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                            {booking.guest?.name || 'Voyageur'}
                        </p>
                        <p className="text-xs text-slate-500">
                            {booking.listing?.title}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-300">
                        {new Date(booking.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Confirmé
                    </span>
                </div>
            </div>
        ))}
    </div>
  );
};

// --- 3. COMPOSANT DE CONTENU PRINCIPAL ---

function OwnerDashboardContent() {
  const router = useRouter();
  const { data, loading, error } = useDashboardData(); 
  useTenantAlert();

  const handleDelegate = (property: any) => {
      Swal.fire({
          icon: 'info',
          title: 'Bientôt disponible',
          text: `La délégation du bien "${property.title}" à une agence sera bientôt active !`,
          background: '#1e293b',
          color: '#fff',
          confirmButtonColor: '#F59E0B'
      });
  };

  const handleWithdraw = async () => {
    if (!data?.user) return;

    const { value: formValues } = await Swal.fire({
      title: 'Effectuer un Retrait',
      html: `
        <div class="text-left space-y-4 font-sans">
            <div class="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20 mb-4">
                <p class="text-orange-400 text-xs font-bold uppercase">Solde Disponible</p>
                <p class="text-xl font-black text-white">${(data.user.walletBalance || 0).toLocaleString()} FCFA</p>
            </div>
            <div>
                <label class="text-xs font-bold text-slate-400 uppercase">Montant à retirer</label>
                <input id="swal-amount" type="number" class="swal2-input w-full bg-slate-800 border-slate-700 text-white mt-1 h-10 text-sm focus:border-orange-500" placeholder="Ex: 50000">
            </div>
            <div>
                <label class="text-xs font-bold text-slate-400 uppercase">Numéro Mobile Money</label>
                <input id="swal-phone" type="tel" class="swal2-input w-full bg-slate-800 border-slate-700 text-white mt-1 h-10 text-sm focus:border-orange-500" placeholder="07 07 00 00 00">
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmer le retrait',
      confirmButtonColor: '#F59E0B',
      cancelButtonText: 'Annuler',
      background: '#0B1120',
      color: '#fff',
      preConfirm: () => {
        const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
        const phone = (document.getElementById('swal-phone') as HTMLInputElement).value;
        if (!amount || !phone) {
          Swal.showValidationMessage('Veuillez remplir tous les champs');
        }
        return { amount, paymentDetails: phone };
      }
    });

    if (formValues) {
      try {
        const storedUser = JSON.parse(localStorage.getItem("immouser") || "{}");
        await api.post('/owner/withdraw', formValues, {
            headers: { 'x-user-email': storedUser.email }
        });
        
        await Swal.fire({
          icon: 'success', title: 'Retrait Initié !',
          text: 'Les fonds seront transférés sous peu.',
          background: '#1e293b', color: '#fff', confirmButtonColor: '#10B981'
        });
        window.location.reload();
      } catch (err: any) {
        Swal.fire({
          icon: 'error', title: 'Erreur',
          text: err.response?.data?.error || "Le retrait a échoué.",
          background: '#1e293b', color: '#fff'
        });
      }
    }
  };

  if (loading) return <PremiumLoader />;
  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#0B1120] p-8">
         <ErrorState message={error || "Impossible de charger les données."} onRetry={() => window.location.reload()} />
      </main>
    );
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const artisans = data.artisans || [];
  const listings = data.listings || [];
  const bookings = data.bookings || [];
  const user = data.user; // Pour accès facile aux données user

  return (
    <main className="min-h-screen bg-[#0B1120] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-[#0B1120] text-slate-200 p-6 lg:p-10 font-sans pb-32">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 animate-in slide-in-from-top-4 duration-500">
        <div>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">{today}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">{user?.name || 'Propriétaire'}</span> 👋
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
                Aperçu global de votre écosystème <span className="text-white font-bold">ImmoFacile</span> & <span className="text-purple-400 font-bold">Akwaba</span>.
            </p>
        </div>

        <div className="flex items-center gap-4">
             <Link href="/dashboard/owner/finance" className="hidden md:flex flex-col items-end px-4 py-2 border-r border-slate-800/50 hover:bg-white/5 transition rounded-lg group cursor-pointer">
                <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-orange-400 transition">Solde Disponible</span>
                <span className="text-xl font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    {(user?.walletBalance || 0).toLocaleString()} FCFA
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:translate-x-1 transition" />
                </span>
             </Link>
        </div>
      </header>
      
      {/* STATS GLOBALES */}
      <section className="mb-10">
        <StatsOverview 
            user={user} 
            stats={data.stats} 
            properties={data.properties || []}
            onWithdraw={handleWithdraw} 
        />
      </section>

      {/* CONTENU PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE (Immobilier & Activité) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Section 1: Immobilier (Long Terme) */}
          <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    🏠 Gestion Locative
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                    {data.properties?.length || 0} Biens
                </span>
             </div>
             
             <PropertiesGrid 
                properties={data.properties || []} 
                onDelegate={handleDelegate} 
             />
          </div>

          {/* Section 2: Akwaba (Court Terme) */}
          <div className="bg-slate-900/30 border border-purple-500/10 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-5">
                <Hotel size={100} />
             </div>
             <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    ✈️ Akwaba (Court Séjour)
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                    {listings.length} Annonces
                </span>
             </div>
             
             {listings.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listings.map((listing: any) => (
                        <div key={listing.id} className="bg-slate-950 p-4 rounded-xl border border-white/5 flex gap-3">
                            <div className="w-16 h-16 bg-slate-800 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${listing.images?.[0]})`}}></div>
                            <div>
                                <h4 className="font-bold text-sm text-white truncate w-32">{listing.title}</h4>
                                <p className="text-xs text-purple-400 font-bold">{listing.pricePerNight?.toLocaleString()} /nuit</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${listing.isPublished ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                                    <span className="text-[10px] text-slate-500 uppercase">{listing.isPublished ? 'En ligne' : 'Brouillon'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
             ) : (
                <div className="text-center py-6">
                    <p className="text-sm text-slate-400">Aucune annonce courte durée.</p>
                    <button className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300">
                        + Publier sur Akwaba
                    </button>
                </div>
             )}
          </div>

          {/* Section 3: Locataires & Clients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Widget Locataires */}
            <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
               <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Locataires (Baux)</h3>
               <TenantsList properties={data.properties || []} />
            </div>

            {/* Widget Voyageurs */}
            <div className="bg-slate-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest">Voyageurs (Akwaba)</h3>
                    <Link href="/dashboard/owner/akwaba/bookings" className="text-[10px] font-bold text-slate-500 hover:text-white transition flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg hover:bg-white/10">
                        Gérer les réservations <ArrowRight size={12} />
                    </Link>
                </div>
                <AkwabaBookingsList bookings={bookings} />
            </div>
          </div>
        </div>

        {/* SIDEBAR (Colonne Droite) */}
        <aside className="space-y-8">
          <div className="sticky top-8">
              
              {/* ✅ BLOC KYC PROPRIÉTAIRE (Ajouté ici) */}
              <OwnerKycWidget isVerified={user?.isVerified || false} />

              {/* Incidents Widget */}
              <IncidentWidget count={data.stats?.activeIncidentsCount || 0} />
              
              <div className="mt-8 space-y-8">
                {/* Artisans Widget */}
                <div className="bg-slate-900 border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      <Phone className="w-5 h-5 text-orange-500" /> 
                      Artisans Agréés
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {artisans.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl">
                        <p className="text-sm text-slate-500 font-bold">Aucun artisan partenaire</p>
                      </div>
                    ) : (
                      artisans.slice(0, 3).map((artisan: any) => (
                        <div key={artisan.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5 hover:border-orange-500/30 transition group/item">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-orange-500 font-black">
                               {artisan.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-200 group-hover/item:text-white transition">{artisan.name}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{artisan.job}</p>
                            </div>
                          </div>
                          <a href={`tel:${artisan.phone}`} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-green-500 hover:text-black transition border border-white/5">
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Documents List */}
                <DocumentsList properties={data.properties || []} />
              </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

// --- 4. EXPORT FINAL ---

export default function OwnerDashboard() {
  return (
    <Suspense fallback={<PremiumLoader />}>
      <OwnerDashboardContent />
    </Suspense>
  );
}
