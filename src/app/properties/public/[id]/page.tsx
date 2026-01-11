"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, CheckCircle, Share2, ArrowLeft, Heart, Loader2, 
  User, Phone, Calendar, Send 
} from "lucide-react";
import { toast } from "sonner"; // Pour les notifications
import Swal from "sweetalert2"; // Pour la confirmation jolie

export default function PublicPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  
  // Galerie Mobile
  const [activeImage, setActiveImage] = useState(0);

  // 1. Chargement Données + Utilisateur
  useEffect(() => {
    // Vérif Auth
    const stored = localStorage.getItem("immouser");
    if (stored) {
        setCurrentUser(JSON.parse(stored));
    }

    // Chargement Bien
    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/public/${id}`); 
        if (res.data.success) {
            setProperty(res.data.property);
        }
      } catch (error) {
        console.error("Erreur chargement bien", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProperty();
  }, [id]);

  // 2. Logique Intelligente du Bouton
  const handleAction = async () => {
    // CAS A : PAS CONNECTÉ -> Redirection
    if (!currentUser) {
        router.push(`/signup?redirect=/properties/public/${id}`);
        return;
    }

    // CAS B : CONNECTÉ -> Appel API Candidature
    // On demande confirmation avant
    const confirm = await Swal.fire({
        title: "Confirmer la candidature ?",
        text: `Vous allez envoyer votre dossier pour ${property.title}. Le propriétaire recevra votre profil financier.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Oui, envoyer mon dossier",
        confirmButtonColor: "#0B1120",
        cancelButtonText: "Annuler",
        background: "#fff",
        color: "#000"
    });

    if (confirm.isConfirmed) {
        setApplying(true);
        try {
            const res = await api.post('/tenant/apply', { propertyId: id }, {
                headers: { 'x-user-email': currentUser.email }
            });

            if (res.data.success) {
                await Swal.fire({
                    title: "Succès ! 🚀",
                    text: "Votre dossier a été transmis au propriétaire. Vous pouvez suivre son avancement dans votre espace.",
                    icon: "success",
                    confirmButtonColor: "#10B981"
                });
                router.push('/dashboard/tenant'); // On le renvoie sur son dashboard
            }

        } catch (error: any) {
            // Gestion erreur (ex: Déjà postulé)
            const msg = error.response?.data?.error || "Une erreur est survenue.";
            Swal.fire({ title: "Oups...", text: msg, icon: "warning" });
        } finally {
            setApplying(false);
        }
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chargement de la visite...</p>
    </div>
  );

  if (!property) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white text-center p-4">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Ce bien n'est plus disponible</h1>
        <Button onClick={() => router.push('/')} className="bg-[#0B1120] text-white">Retour à l'accueil</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-100 selection:text-orange-600 font-sans">
        
      {/* HEADER FLOTTANT */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center pointer-events-none">
         <Button 
            size="icon" variant="outline" 
            className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 hover:bg-white pointer-events-auto h-10 w-10" 
            onClick={() => router.back()}
         >
            <ArrowLeft className="w-5 h-5 text-slate-900" />
         </Button>

         <div className="flex gap-2 pointer-events-auto">
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10">
                <Share2 className="w-4 h-4 text-slate-900" />
            </Button>
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10">
                <Heart className="w-4 h-4 text-slate-900" />
            </Button>
         </div>
      </header>

      {/* GALERIE PHOTOS */}
      <div className="md:hidden relative h-[45vh] bg-slate-200">
        {property.images?.[0] ? (
            <Image src={property.images[activeImage]} alt={property.title} fill className="object-cover"/>
        ) : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">Pas de photo</div>}
        
        {property.images?.length > 1 && (
             <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                {activeImage + 1} / {property.images.length}
             </div>
        )}
      </div>

      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] p-6 max-w-7xl mx-auto rounded-3xl overflow-hidden mt-20">
        <div className="col-span-2 row-span-2 relative bg-slate-100 rounded-l-2xl overflow-hidden cursor-pointer group">
            {property.images?.[0] && <Image src={property.images[0]} alt="Main" fill className="object-cover transition duration-700 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
        </div>
        {property.images?.slice(1, 5).map((img: string, idx: number) => (
            <div key={idx} className="relative bg-slate-100 overflow-hidden cursor-pointer group last:rounded-br-2xl [&:nth-child(3)]:rounded-tr-2xl">
                 <Image src={img} alt={`Vue ${idx}`} fill className="object-cover transition duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
            </div>
        ))}
         {property.images?.length > 5 && (
            <Button variant="secondary" className="absolute bottom-10 right-10 shadow-xl bg-white text-black font-bold text-xs hover:scale-105 transition">
                Voir toutes les photos
            </Button>
        )}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-6 py-8 md:grid md:grid-cols-12 md:gap-12">
        
        {/* COLONNE GAUCHE */}
        <div className="md:col-span-8">
            <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-xs uppercase tracking-wide">
                    {property.type || "Résidence"}
                </Badge>
                {property.isAvailable ? (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none flex gap-1 px-3 py-1 text-xs uppercase tracking-wide">
                        <CheckCircle className="w-3 h-3" /> Disponible
                    </Badge>
                ) : (
                    <Badge className="bg-red-50 text-red-700 border-none px-3 py-1 text-xs uppercase tracking-wide">Déjà Loué</Badge>
                )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 leading-tight tracking-tight">
                {property.title}
            </h1>
            <p className="flex items-center text-slate-500 font-medium text-lg mb-8">
                <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                {property.address}, {property.commune}
            </p>

            <div className="h-px w-full bg-slate-100 mb-8" />

            <div className="flex justify-between md:justify-start md:gap-16 mb-8 text-center md:text-left">
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900">{property.bedrooms || 0}</span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">Chambres</span>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900">{property.bathrooms || 1}</span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">Douches</span>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900">{property.surface || '-'}</span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">m²</span>
                </div>
            </div>

            <div className="h-px w-full bg-slate-100 mb-8" />

            <div className="mb-12">
                <h3 className="font-bold text-xl mb-4 text-slate-900">À propos</h3>
                <p className="text-slate-600 leading-8 text-base md:text-lg font-light whitespace-pre-wrap">
                    {property.description || "Aucune description détaillée n'a été fournie pour ce bien."}
                </p>
            </div>
            
            <div className="mb-12">
                <h3 className="font-bold text-xl mb-4 text-slate-900">Ce que propose ce logement</h3>
                <div className="grid grid-cols-2 gap-4">
                    {["Climatisation", "Wifi Fibre", "Parking sécurisé", "Cuisine équipée", "Gardien 24/7", "Piscine"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-600">
                            <CheckCircle className="w-5 h-5 text-slate-300" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : CARTE ACTION */}
        <div className="md:col-span-4 relative hidden md:block">
            <div className="sticky top-24">
                <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 overflow-hidden relative">
                    
                    <div className="flex items-end gap-2 mb-6">
                        <span className="text-4xl font-black text-slate-900">{property.price?.toLocaleString()}</span>
                        <span className="text-lg font-bold text-orange-500 mb-1.5">FCFA</span>
                        <span className="text-slate-400 mb-1.5">/ mois</span>
                    </div>

                    {/* Zone d'action dynamique */}
                    {property.isAvailable ? (
                        <>
                            {currentUser ? (
                                <div className="mb-4 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-700">Connecté en tant que</p>
                                        <p className="text-sm font-bold text-emerald-900 truncate max-w-[150px]">{currentUser.name}</p>
                                    </div>
                                </div>
                            ) : null}

                            <Button 
                                onClick={handleAction}
                                disabled={applying}
                                className={`w-full font-bold h-14 rounded-2xl text-lg transition-all shadow-lg 
                                    ${currentUser 
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30' 
                                        : 'bg-[#0B1120] hover:bg-slate-800 text-white'
                                    }`}
                            >
                                {applying ? <Loader2 className="animate-spin" /> : (
                                    currentUser ? "Confirmer ma candidature" : "Postuler (Connexion requise)"
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold h-14 rounded-2xl">
                            Ce bien est loué
                        </Button>
                    )}
                    
                    <p className="text-center text-xs text-slate-400 mt-4">
                        {currentUser 
                            ? "Votre profil sera envoyé immédiatement." 
                            : "Vous devrez créer un compte pour continuer."}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* STICKY MOBILE */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 md:hidden flex items-center justify-between z-50 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Loyer mensuel</p>
            <p className="text-xl font-black text-slate-900">
                {property.price?.toLocaleString()} <span className="text-sm font-bold text-orange-500">F</span>
            </p>
        </div>
        <Button 
            onClick={handleAction}
            disabled={!property.isAvailable || applying}
            className={`font-bold px-6 rounded-xl shadow-lg ${currentUser ? 'bg-orange-500' : 'bg-[#0B1120]'}`}
        >
            {applying ? <Loader2 className="animate-spin w-5 h-5" /> : (currentUser ? "Confirmer" : "Postuler")}
        </Button>
      </div>

    </div>
  );
}
