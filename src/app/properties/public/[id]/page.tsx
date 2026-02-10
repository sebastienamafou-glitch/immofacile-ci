import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth"; // Session Serveur
import { prisma } from "@/lib/prisma";
import ApplyButton from "@/components/property/ApplyButton"; // ✅ Le composant créé à l'étape 1
import { 
  MapPin, CheckCircle, Share2, ArrowLeft, Heart, BedDouble, Bath, Square, User 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// 1. GÉNÉRATION DES MÉTADONNÉES SEO
export async function generateMetadata({ params }: { params: { id: string } }) {
    const property = await prisma.property.findUnique({ where: { id: params.id } });
    if (!property) return { title: "Bien introuvable - ImmoFacile" };
    
    return {
        title: `${property.title} à louer - ImmoFacile`,
        description: `${property.type} de ${property.bedrooms} pièces à ${property.commune}. Loyer : ${property.price.toLocaleString()} FCFA.`,
        openGraph: {
            images: property.images[0] ? [property.images[0]] : [],
        }
    };
}

// 2. COMPOSANT PAGE (SERVER SIDE)
export default async function PublicPropertyPage({ params }: { params: { id: string } }) {
  // A. SÉCURITÉ & DONNÉES
  const session = await auth();
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
        owner: { select: { name: true, image: true } } // Données publiques du propriétaire
    }
  });

  if (!property) return notFound();

  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-20 selection:bg-orange-100 selection:text-orange-600">
        
      {/* HEADER NAVIGATION */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center pointer-events-none">
         <Link href="/" className="pointer-events-auto">
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10">
                <ArrowLeft className="w-5 h-5 text-slate-900" />
            </Button>
         </Link>

         <div className="flex gap-2 pointer-events-auto">
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10">
                <Share2 className="w-4 h-4 text-slate-900" />
            </Button>
            <Button size="icon" variant="outline" className="rounded-full bg-white/90 backdrop-blur shadow-lg border-white/20 h-10 w-10">
                <Heart className="w-4 h-4 text-slate-900" />
            </Button>
         </div>
      </header>

      {/* GALERIE PHOTOS (Server Rendered) */}
      {/* Mobile : Simple scroll horizontal pour la perf */}
      <div className="md:hidden relative h-[45vh] bg-slate-200 overflow-hidden">
        {property.images?.[0] ? (
            <Image src={property.images[0]} alt={property.title} fill className="object-cover"/>
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">Pas de photo</div>
        )}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
            1 / {property.images.length}
        </div>
      </div>

      {/* Desktop : Grid Benta */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] p-6 max-w-7xl mx-auto rounded-3xl overflow-hidden mt-20">
        <div className="col-span-2 row-span-2 relative bg-slate-100 rounded-l-2xl overflow-hidden group">
            {property.images?.[0] && <Image src={property.images[0]} alt="Main" fill className="object-cover transition duration-700 group-hover:scale-105" priority />}
        </div>
        {property.images?.slice(1, 5).map((img, idx) => (
            <div key={idx} className="relative bg-slate-100 overflow-hidden group last:rounded-br-2xl [&:nth-child(3)]:rounded-tr-2xl">
                 <Image src={img} alt={`Vue ${idx}`} fill className="object-cover transition duration-700 group-hover:scale-105" />
            </div>
        ))}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-6 py-8 md:grid md:grid-cols-12 md:gap-12">
        
        {/* INFO BIEN (Gauche) */}
        <div className="md:col-span-8">
            <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-xs uppercase tracking-wide">
                    {property.type}
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

            {/* KPIs */}
            <div className="flex justify-between md:justify-start md:gap-16 mb-8 text-center md:text-left">
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900 flex items-center justify-center md:justify-start gap-2">
                         <BedDouble className="w-6 h-6 text-slate-400 md:hidden" /> {property.bedrooms}
                    </span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">Chambres</span>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900 flex items-center justify-center md:justify-start gap-2">
                        <Bath className="w-6 h-6 text-slate-400 md:hidden" /> {property.bathrooms}
                    </span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">Douches</span>
                </div>
                <div className="w-px h-12 bg-slate-100" />
                <div>
                    <span className="block font-bold text-2xl md:text-3xl text-slate-900 flex items-center justify-center md:justify-start gap-2">
                        <Square className="w-6 h-6 text-slate-400 md:hidden" /> {property.surface || '-'}
                    </span>
                    <span className="text-xs md:text-sm text-slate-400 font-medium uppercase tracking-wide">m²</span>
                </div>
            </div>

            <div className="h-px w-full bg-slate-100 mb-8" />

            <div className="mb-12">
                <h3 className="font-bold text-xl mb-4 text-slate-900">À propos</h3>
                <p className="text-slate-600 leading-8 text-base md:text-lg font-light whitespace-pre-wrap">
                    {property.description || "Aucune description détaillée."}
                </p>
            </div>
            
            {/* Commodités (Statique pour l'instant) */}
            <div className="mb-12">
                <h3 className="font-bold text-xl mb-4 text-slate-900">Les plus</h3>
                <div className="grid grid-cols-2 gap-4">
                    {["Climatisation", "Sécurisé", "Cuisine équipée"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-slate-600">
                            <CheckCircle className="w-5 h-5 text-slate-300" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* COLONNE DROITE : CARTE ACTION STICKY */}
        <div className="md:col-span-4 relative hidden md:block">
            <div className="sticky top-28">
                <div className="bg-white rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-8 overflow-hidden relative">
                    
                    <div className="flex items-end gap-2 mb-6">
                        <span className="text-4xl font-black text-slate-900">{property.price.toLocaleString()}</span>
                        <span className="text-lg font-bold text-orange-500 mb-1.5">FCFA</span>
                        <span className="text-slate-400 mb-1.5">/ mois</span>
                    </div>

                    {/* ✅ COMPOSANT CLIENT ISOLÉ */}
                    <ApplyButton 
                        propertyId={property.id}
                        propertyTitle={property.title}
                        isLoggedIn={isLoggedIn}
                        isAvailable={property.isAvailable}
                        price={property.price}
                    />

                    {/* Info Propriétaire */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                             {property.owner?.image ? (
                                <Image src={property.owner.image} width={48} height={48} alt="Proprio" />
                             ) : (
                                <User className="text-slate-400" />
                             )}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Géré par</p>
                            <p className="font-bold text-sm">{property.owner?.name || "Agence Partenaire"}</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
      </div>

      {/* STICKY MOBILE (Bottom Bar) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 md:hidden flex items-center justify-between z-50 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Loyer mensuel</p>
            <p className="text-xl font-black text-slate-900">
                {property.price.toLocaleString()} <span className="text-sm font-bold text-orange-500">F</span>
            </p>
        </div>
        <div className="w-1/2">
             <ApplyButton 
                propertyId={property.id}
                propertyTitle={property.title}
                isLoggedIn={isLoggedIn}
                isAvailable={property.isAvailable}
                price={property.price}
            />
        </div>
      </div>

    </div>
  );
}
