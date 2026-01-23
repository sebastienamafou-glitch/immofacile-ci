import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ShieldCheck, Star, Calendar, CreditCard, Lock, UserCircle2 } from "lucide-react";
import CheckoutButton from "@/components/akwaba/CheckoutButton"; // Composant Client qu'on va créer juste après

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { listingId?: string; from?: string; to?: string; guests?: string }
}) {
  // 1. Validation des paramètres
  if (!searchParams.listingId || !searchParams.from || !searchParams.to) {
    redirect("/akwaba"); // Redirection si URL incomplète
  }

  // 2. Récupération User connecté (Sécurité)
  const userEmail = headers().get("x-user-email");
  if (!userEmail) {
    // Si pas connecté, on renvoie au login avec retour ici
    const currentQuery = new URLSearchParams(searchParams as any).toString();
    redirect(`/login?callbackUrl=${encodeURIComponent(`/checkout?${currentQuery}`)}`);
  }

  // 3. Récupération des données du logement
  const listing = await prisma.listing.findUnique({
    where: { id: searchParams.listingId },
    include: { host: true }
  });

  if (!listing) redirect("/akwaba");

  // 4. Calculs finaux (Sécurité : on recalcule côté serveur)
  const startDate = new Date(searchParams.from);
  const endDate = new Date(searchParams.to);
  const nights = differenceInDays(endDate, startDate);
  const subTotal = nights * listing.pricePerNight;
  const serviceFee = Math.round(subTotal * 0.10);
  const total = subTotal + serviceFee;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 pb-20">
      
      {/* Header Simple */}
      <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
            <Link href={`/akwaba/${listing.id}`} className="flex items-center gap-2 hover:text-white transition text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Annuler et retourner au logement
            </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
            <Lock className="w-6 h-6 text-orange-500" /> Demande de réservation
        </h1>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
            
            {/* COLONNE GAUCHE : DÉTAILS DU VOYAGE */}
            <div className="space-y-8">
                
                {/* Section Dates */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Votre voyage</h2>
                    <div className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/5">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="font-bold text-white text-sm">Dates</p>
                                <p className="text-sm text-slate-400">
                                    {format(startDate, "d MMM", { locale: fr })} - {format(endDate, "d MMM yyyy", { locale: fr })}
                                </p>
                            </div>
                        </div>
                        <Link href={`/akwaba/${listing.id}`} className="text-xs font-bold underline hover:text-orange-500">Modifier</Link>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/5">
                         <div className="flex items-center gap-3">
                            <UserCircle2 className="w-5 h-5 text-orange-500" /> 
                            {/* Note: Icone UserCircle2 à importer si besoin, sinon User */}
                            <div>
                                <p className="font-bold text-white text-sm">Voyageurs</p>
                                <p className="text-sm text-slate-400">{searchParams.guests} voyageur(s)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="border-white/10" />

                {/* Section Paiement */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white">Payer avec</h2>
                    
                    {/* Mockup Moyens de paiement */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-orange-500 bg-orange-500/10 p-4 rounded-xl flex items-center gap-3 cursor-pointer ring-1 ring-orange-500">
                            <CreditCard className="w-5 h-5 text-orange-500" />
                            <span className="font-bold text-white text-sm">Wave / OM</span>
                        </div>
                        <div className="border border-white/10 bg-white/5 p-4 rounded-xl flex items-center gap-3 cursor-not-allowed opacity-50">
                            <span className="font-bold text-slate-400 text-sm">Carte Bancaire</span>
                        </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                        En cliquant sur le bouton ci-dessous, vous acceptez les <span className="underline">Conditions Générales</span> d'Akwaba. 
                        Votre compte sera débité de <strong>{total.toLocaleString()} FCFA</strong>.
                    </p>

                    {/* ✅ BOUTON ACTION CLIENT */}
                    <CheckoutButton 
                        listingId={listing.id}
                        startDate={startDate.toISOString()}
                        endDate={endDate.toISOString()}
                        totalPrice={total}
                        userEmail={userEmail}
                    />
                </div>
            </div>

            {/* COLONNE DROITE : RÉCAPITULATIF STICKY */}
            <div className="relative">
                <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl sticky top-32 shadow-2xl">
                    
                    {/* Card Logement */}
                    <div className="flex gap-4 mb-6 pb-6 border-b border-white/5">
                        <div className="relative w-24 h-24 bg-slate-800 rounded-xl overflow-hidden shrink-0">
                            <Image src={listing.images[0] || "/placeholder.jpg"} alt="Thumbnail" fill className="object-cover" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Logement entier</p>
                            <h3 className="font-bold text-white text-sm leading-tight mb-2 line-clamp-2">{listing.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Star className="w-3 h-3 text-orange-500 fill-orange-500" /> 
                                <span className="font-bold text-white">4.92</span> (28 avis)
                            </div>
                        </div>
                    </div>

                    {/* Détails Prix */}
                    <h3 className="font-bold text-white mb-4">Détails du prix</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-slate-400">
                            <span>{listing.pricePerNight.toLocaleString()} F x {nights} nuits</span>
                            <span>{subTotal.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span className="underline decoration-dotted">Frais de service Akwaba</span>
                            <span>{serviceFee.toLocaleString()} F</span>
                        </div>
                        
                        <div className="h-px bg-white/10 my-2"></div>
                        
                        <div className="flex justify-between text-white font-black text-lg">
                            <span>Total (FCFA)</span>
                            <span>{total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
