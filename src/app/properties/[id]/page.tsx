"use client";

import { useEffect, useState } from "react"; // ❌ "use" retiré ici
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, CheckCircle, Share2, ArrowLeft, Loader2, 
  BedDouble, Bath, Square, ShieldCheck, Home
} from "lucide-react";

// ✅ CORRECTION MAJEURE : params n'est pas une Promise ici
export default function PublicPropertyPage({ params }: { params: { id: string } }) {
  
  // ✅ CORRECTION : On récupère l'ID directement
  const { id } = params;
  
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // États UI
  const [activeImage, setActiveImage] = useState(0);

  // 1. Chargement des données & Auth Check
  useEffect(() => {
    // Check Auth rapide
    const stored = localStorage.getItem("immouser");
    if (stored) setCurrentUser(JSON.parse(stored));

    const fetchProperty = async () => {
      try {
        const res = await api.get(`/public/properties/${id}`); 
        if (res.data) {
            setProperty(res.data);
        }
      } catch (error) {
        console.error("Erreur chargement bien", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProperty();
  }, [id]);

  // 2. Logique du bouton "Déposer mon dossier"
  const handleApply = async () => {
    // A. Si pas connecté -> Login/Signup
    if (!currentUser) {
        Swal.fire({
            title: 'Connectez-vous',
            text: "Vous devez avoir un compte locataire pour déposer un dossier.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Créer un compte',
            cancelButtonText: 'Annuler',
            confirmButtonColor: '#0B1120',
            background: '#fff', color: '#000'
        }).then((result) => {
            if (result.isConfirmed) {
                // Redirection intelligente
                router.push(`/signup?redirect=/properties/public/${id}`);
            }
        });
        return;
    }

    // B. Confirmation
    const result = await Swal.fire({
        title: 'Déposer mon dossier ?',
        text: `Le propriétaire ${property.owner?.name || ''} recevra votre profil immédiatement.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, postuler',
        confirmButtonColor: '#F97316',
        cancelButtonText: 'Attendre',
        background: '#fff', color: '#000'
    });

    if (result.isConfirmed) {
        setApplying(true);
        try {
            // Appel API Sécurisé
            await api.post('/tenant/apply', { propertyId: property.id });
            
            await Swal.fire({
                title: 'Félicitations !',
                text: 'Votre dossier a été transmis. Suivez son avancement dans votre espace.',
                icon: 'success',
                confirmButtonColor: '#10B981'
            });
            
            router.push('/dashboard/tenant');
            
        } catch (error: any) {
            Swal.fire('Oups', error.response?.data?.error || "Vous avez déjà postulé à ce bien.", 'error');
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
        <Button onClick={() => router.push('/')} className="bg-[#0B1120] text-white hover:bg-slate-800">Retour à l'accueil</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-100 selection:text-orange-600 font-sans pb-20">
        
      {/* HEADER FLOTTANT */}
      <header className="fixed top-0 left-0 w-full z-50 px-4 py-4 md:px-6 flex justify-between items-center pointer-events-none">
         <Button 
            size="icon" variant="outline" 
            className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 hover:bg-white pointer-events-auto h-10 w-10 transition hover:scale-110" 
            onClick={() => router.back()}
         >
            <ArrowLeft className="w-5 h-5 text-slate-900" />
         </Button>

         <div className="flex gap-2 pointer-events-auto">
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10 hover:bg-white transition">
                <Share2 className="w-4 h-4 text-slate-900" />
            </Button>
         </div>
      </header>

      {/* GALERIE PHOTOS */}
      {/* Mobile */}
      <div className="md:hidden relative h-[50vh] bg-slate-200">
        {property.images?.[0] ? (
            <Image src={property.images[activeImage]} alt={property.title} fill className="object-cover"/>
        ) : <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">Pas de photo</div>}
        
        {property.images?.length > 1 && (
             <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                {activeImage + 1} / {property.images.length}
             </div>
        )}
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] p-6 max-w-7xl mx-auto rounded-3xl overflow-hidden mt-20">
        <div className="col-span-2 row-span-2 relative bg-slate-100 rounded-l-2xl overflow-hidden cursor-pointer group">
            {property.images?.[0] ? (
                <Image src={property.images[0]} alt="Main" fill className="object-cover transition duration-700 group-hover:scale-105" priority />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400"><Home className="w-12 h-12 opacity-20"/></div>
            )}
        </div>
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative bg-slate-100 overflow-hidden cursor-pointer group last:rounded-br-2xl [&:nth-child(3)]:rounded-tr-2xl">
                 {property.images?.[i] && (
                    <Image src={property.images[i]} alt={`Vue ${i}`} fill className="object-cover transition duration-700 group-hover:scale-105" />
                 )}
            </div>
        ))}
        {property.images?.length > 5 && (
            <Button variant="secondary" className="absolute bottom-6 right-6 shadow-xl bg-white text-black font-bold text-xs hover:scale-105 transition">
                Voir toutes les photos
            </Button>
        )}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-6 py-8 md:grid md:grid-cols-12 md:gap-16">
        
        {/* COLONNE GAUCHE (INFO) */}
        <div className="md:col-span-7 lg:col-span-8 space-y-8">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none px-3 py-1 text-xs uppercase tracking-wide">
                    {property.type || "Bien"}
                </Badge>
                {property.owner?.kycStatus === 'VERIFIED' && (
                    <Badge className="bg-blue-50 text-blue-700 border-none flex gap-1 px-3 py-1 text-xs uppercase tracking-wide">
                        <ShieldCheck className="w-3 h-3" /> Propriétaire Vérifié
                    </Badge>
                )}
            </div>

            <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-tight">
                    {property.title}
                </h1>
                <p className="flex items-center text-slate-500 font-medium text-lg">
                    <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                    {property.address}, {property.commune}
                </p>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* KPIs */}
            <div className="flex justify-between md:justify-start md:gap-16 text-center md:text-left">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><BedDouble className="w-6 h-6"/></div>
                    <div>
                        <span className="block font-bold text-xl text-slate-900">{property.bedrooms || 0}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase">Chambres</span>
                    </div>
                </div>
                <div className="w-px h-12 bg-slate-100 mx-4 md:mx-0" />
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><Bath className="w-6 h-6"/></div>
                    <div>
                        <span className="block font-bold text-xl text-slate-900">{property.bathrooms || 1}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase">Douches</span>
                    </div>
                </div>
                <div className="w-px h-12 bg-slate-100 mx-4 md:mx-0" />
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><Square className="w-6 h-6"/></div>
                    <div>
                        <span className="block font-bold text-xl text-slate-900">{property.surface || '-'}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase">m²</span>
                    </div>
                </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            {/* Description */}
            <div>
                <h3 className="font-bold text-xl mb-4 text-slate-900">À propos</h3>
                <p className="text-slate-600 leading-8 text-base md:text-lg font-light whitespace-pre-line">
                    {property.description || "Aucune description détaillée n'a été fournie pour ce bien."}
                </p>
            </div>

            {/* Équipements */}
            <div>
                <h3 className="font-bold text-xl mb-4 text-slate-900">Ce que propose ce logement</h3>
                <div className="grid grid-cols-2 gap-4">
                    {["Climatisation", "Parking sécurisé", "Cuisine équipée", "Gardien 24/7"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-600 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium text-sm">{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : Sticky Card Action */}
        <div className="md:col-span-5 lg:col-span-4 relative hidden md:block">
            <div className="sticky top-28">
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 overflow-hidden relative">
                    
                    {/* Prix */}
                    <div className="mb-8">
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider line-through">
                            {(property.price * 1.1).toLocaleString()} F
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-slate-900 tracking-tight">
                                {property.price?.toLocaleString()}
                            </span>
                            <span className="text-xl font-bold text-orange-500">FCFA</span>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">/ mois hors charges</span>
                    </div>

                    {/* Bouton Action */}
                    <Button 
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full bg-[#0B1120] hover:bg-orange-600 text-white font-bold h-14 rounded-xl text-lg transition-all shadow-lg hover:shadow-orange-500/30 mb-4"
                    >
                        {applying ? <Loader2 className="animate-spin w-5 h-5"/> : "Déposer mon dossier"}
                    </Button>
                    
                    <div className="flex justify-center items-center gap-2 text-xs text-slate-400 font-medium text-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Dossier 100% numérique & sécurisé.
                    </div>

                    {/* Info Propriétaire */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 font-black text-lg border border-slate-200">
                            {(property.owner?.name || "P").charAt(0)}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Géré par</p>
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{property.owner?.name || "Propriétaire"}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>

      {/* Sticky Bottom Mobile */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 md:hidden flex items-center justify-between z-40 safe-area-bottom">
        <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Loyer mensuel</p>
            <p className="text-xl font-black text-slate-900">
                {property.price?.toLocaleString()} <span className="text-sm font-bold text-orange-500">F</span>
            </p>
        </div>
        <Button 
            onClick={handleApply} 
            disabled={applying}
            className="bg-[#0B1120] hover:bg-orange-500 text-white font-bold px-8 h-12 rounded-xl shadow-lg"
        >
            {applying ? <Loader2 className="animate-spin w-5 h-5"/> : "Postuler"}
        </Button>
      </div>

    </div>
  );
}
