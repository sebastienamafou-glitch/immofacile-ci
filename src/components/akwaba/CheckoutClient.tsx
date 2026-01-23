"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Calendar, Users, ArrowLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CheckoutClientProps {
  listing: {
    id: string;
    title: string;
    city: string;
    pricePerNight: number;
    images: string[];
  };
  startDate: Date;
  endDate: Date;
  guests: number;
  nights: number;
  total: number;
  currentUserEmail: string; // ✅ Reçoit l'email validé
}

export default function CheckoutClient({ 
  listing, startDate, endDate, guests, nights, total, currentUserEmail 
}: CheckoutClientProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
        // PROD STRICT : On ne touche pas aux headers d'auth ici.
        // Le Cookie HttpOnly fait tout le travail.
        const res = await fetch('/api/akwaba/booking/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
                // ❌ SUPPRIMÉ : 'x-user-email'. Le middleware s'en charge !
            },
            body: JSON.stringify({
                listingId: listing.id,
                startDate,
                endDate,
                guests
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            await Swal.fire({
                title: 'Réservation Confirmée ! 🌍',
                text: 'Votre séjour est validé. Préparez vos valises !',
                icon: 'success',
                confirmButtonColor: '#ea580c',
                confirmButtonText: 'Voir mon billet'
            });
            router.push('/dashboard/guest/trips');
        } else {
            // Gestion d'erreur robuste
            if (res.status === 401) {
                toast.error("Session expirée. Veuillez vous reconnecter.");
                router.push("/login");
            } else {
                toast.error(data.error || "Impossible de finaliser la réservation.");
            }
        }
    } catch (error) {
        console.error(error);
        toast.error("Erreur de connexion au serveur.");
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 animate-in fade-in duration-700">
        
        {/* COLONNE GAUCHE */}
        <div>
            <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </button>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Confirmer et payer</h1>
            
            {/* Badge Utilisateur Connecté */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-8 bg-slate-100 py-2 px-3 rounded-full w-fit">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Réservation pour : <span className="font-bold text-slate-700">{currentUserEmail}</span></span>
            </div>
            
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="font-bold text-slate-900">Votre voyage</h3>
                        <div className="flex items-center gap-2 text-slate-600 mt-2">
                             <Calendar className="w-4 h-4 text-orange-500" />
                             <span>{startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 mt-1">
                             <Users className="w-4 h-4 text-orange-500" />
                             <span>{guests} voyageur(s)</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-slate-900 mb-4">Payer avec</h3>
                    <div className="grid gap-4">
                        <div className="border-2 border-orange-500 bg-orange-50/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer w-full relative transition-all hover:shadow-md">
                            <div className="absolute top-3 right-3 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
                            <div className="w-10 h-10 bg-[#1d9bf0] rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm">Wave</div>
                            <span className="font-bold text-slate-900">Wave CI</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* COLONNE DROITE */}
        <div>
            <Card className="bg-white border-slate-200 shadow-xl rounded-2xl overflow-hidden sticky top-24">
                <div className="p-6 flex gap-4 border-b border-slate-100">
                    <div className="relative w-24 h-24 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                        {listing.images?.[0] && <Image src={listing.images[0]} alt="Cover" fill className="object-cover" />}
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Logement entier</p>
                        <h3 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-2">{listing.title}</h3>
                        <p className="text-sm text-slate-500">{listing.city}</p>
                    </div>
                </div>

                <CardContent className="p-6 space-y-4">
                    <h3 className="font-bold text-lg text-slate-900">Détails du prix</h3>
                    
                    <div className="flex justify-between text-slate-600">
                        <span>{listing.pricePerNight.toLocaleString()} F x {nights} nuits</span>
                        <span>{(listing.pricePerNight * nights).toLocaleString()} F</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span className="underline decoration-dotted">Frais de service</span>
                        <span className="text-orange-600 font-medium">Offerts</span>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between items-center">
                        <span className="font-black text-lg text-slate-900">Total (XOF)</span>
                        <span className="font-black text-xl text-slate-900">{total.toLocaleString()} F</span>
                    </div>

                    <Button 
                        onClick={handlePayment} 
                        disabled={processing}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-14 text-lg rounded-xl shadow-lg shadow-orange-500/20 mt-6 active:scale-95 transition-transform"
                    >
                        {processing ? <Loader2 className="animate-spin" /> : "Confirmer et payer"}
                    </Button>
                    
                    <div className="flex justify-center items-center gap-2 text-xs text-slate-400 font-medium mt-4">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Paiement 100% sécurisé
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
