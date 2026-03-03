import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ApplyButton from "@/components/property/ApplyButton";
import GhostTracker from "@/components/property/GhostTracker";
import { 
  MapPin, CheckCircle, Share2, ArrowLeft, Heart, BedDouble, 
  Bath, Square, User, ShieldCheck, ShieldAlert, AlertTriangle,
  MoveRight, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// 1. MÉTADONNÉES SEO & WHATSAPP
export async function generateMetadata(props: PageProps) {
    const params = await props.params;
    const property = await prisma.property.findUnique({ 
        where: { id: params.id },
        include: { owner: { select: { kyc: true } } }
    });
    
    if (!property) return { title: "Bien introuvable - Babimmo" };
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.immofacile.ci";
    const isGhost = property.owner?.kyc?.status !== 'VERIFIED';

    const ogUrl = new URL(`${appUrl}/api/og/property`);
    ogUrl.searchParams.set("title", property.title);
    ogUrl.searchParams.set("price", property.price.toString());
    ogUrl.searchParams.set("location", property.commune);
    ogUrl.searchParams.set("ghost", isGhost.toString());

    return {
        title: `${property.title} à louer - Babimmo`,
        description: `${property.type} à ${property.commune}. Loyer : ${property.price.toLocaleString()} FCFA.`,
        openGraph: { title: property.title, images: [ogUrl.toString()] },
        twitter: { card: "summary_large_image", images: [ogUrl.toString()] }
    };
}

// 2. COMPOSANT PAGE PRINCIPALE
export default async function PublicPropertyPage(props: PageProps) {
  const params = await props.params;
  const session = await auth();
  
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, image: true, kyc: true } } }
  });

  if (!property) return notFound();

  const isLoggedIn = !!session?.user;
  const isGhost = property.owner?.kyc?.status !== 'VERIFIED';
  const hasMultipleImages = property.images && property.images.length > 1;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.babimmo.ci";
  const propertyUrl = `${appUrl}/properties/${property.id}`;
  const whatsappShareMessage = encodeURIComponent(`Découvre ce bien sur Babimmo : ${property.title} à ${property.price.toLocaleString()} FCFA.\n\nVoir les détails et photos ici : ${propertyUrl}`);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 selection:bg-orange-100 selection:text-orange-600">
        
      {/* TRACKER INVISIBLE */}
      <Suspense fallback={null}>
          <GhostTracker propertyId={property.id} />
      </Suspense>

      {/* BANNIÈRE PRO (GROWTH HACK) */}
      {isGhost && (
        <div className="bg-gradient-to-r from-slate-900 to-[#0B1120] text-white p-4 pt-20 md:pt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-orange-500 z-40 relative shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/20 p-2.5 rounded-full border border-orange-500/50 hidden md:block animate-pulse">
               <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-[11px] md:text-sm font-black text-orange-400 uppercase tracking-widest mb-0.5">Avis aux professionnels</p>
              <p className="text-xs md:text-sm text-slate-300">Vous gérez ce bien ? Revendiquez-le pour recevoir vos locataires sur WhatsApp.</p>
            </div>
          </div>
          <Link 
            href={`/signup?claim=${property.id}`} 
            className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 text-[#0B1120] font-black px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-transform hover:scale-105 flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
          >
            C'est mon annonce
          </Link>
        </div>
      )}

      {/* HEADER NAVIGATION (VRAI GLASSMORPHISM + LOGO) */}
      <header className={`fixed top-0 left-0 w-full z-50 px-4 py-3 flex justify-between items-center pointer-events-none transition-all ${isGhost ? 'md:relative md:bg-transparent md:py-2' : ''}`}>
         <div className="w-1/3 flex justify-start pointer-events-auto">
            <Link href="/properties">
               <Button size="icon" variant="outline" className="rounded-full bg-white/80 backdrop-blur-md shadow-lg border-white/40 h-10 w-10 hover:bg-white transition">
                   <ArrowLeft className="w-5 h-5 text-slate-900" />
               </Button>
            </Link>
         </div>

         <div className="w-1/3 flex justify-center pointer-events-auto">
            <Link href="/" className="bg-white/90 backdrop-blur-md shadow-xl border border-white/40 rounded-2xl px-4 py-2 flex items-center justify-center transition-transform hover:scale-105">
                <Image src="/logo.png" alt="Logo Babimmo" width={28} height={28} className="object-contain" priority />
            </Link>
         </div>

         {/* Actions (Partager / Favoris) */}
         <div className="w-1/3 flex justify-end gap-2 pointer-events-auto">
            <a href={`https://wa.me/?text=${whatsappShareMessage}`} target="_blank" rel="noopener noreferrer" title="Partager sur WhatsApp">
                <Button size="icon" variant="outline" className="rounded-full bg-white/80 backdrop-blur-md shadow-lg border-white/40 h-10 w-10 hover:bg-[#25D366] hover:border-[#25D366] transition group">
                    <Share2 className="w-4 h-4 text-slate-900 group-hover:text-white" />
                </Button>
            </a>
            <Button size="icon" variant="outline" className="rounded-full bg-white/80 backdrop-blur-md shadow-lg border-white/40 h-10 w-10 hover:bg-white transition hover:text-red-500">
                <Heart className="w-4 h-4 text-slate-900" />
            </Button>
         </div>
      </header>

      {/* 📱 GALERIE MOBILE NATIVE (SWIPEABLE) */}
      <div className={`md:hidden relative w-full h-[55vh] bg-slate-200 ${isGhost ? '' : 'mt-0'}`}>
        {property.images && property.images.length > 0 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory h-full w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {property.images.map((img, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                        <Image src={img} alt={`${property.title} - Vue ${idx + 1}`} fill className="object-cover" priority={idx === 0} />
                        {/* Ombre dégradée pour faire ressortir le header */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
                <Image src="/logo.png" alt="No image" width={64} height={64} className="opacity-20 mb-2 grayscale" />
                <span className="text-sm font-bold">Image indisponible</span>
            </div>
        )}

        {/* Indicateur de Swipe élégant */}
        {hasMultipleImages && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-lg border border-white/10">
                Balayez les photos <MoveRight className="w-3 h-3 animate-pulse" />
            </div>
        )}
      </div>

      {/* 💻 GALERIE DESKTOP (GRID PREMIUM) */}
      <div className={`hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[65vh] max-w-7xl mx-auto rounded-3xl overflow-hidden px-6 ${isGhost ? 'mt-6' : 'mt-24'}`}>
        <div className="col-span-2 row-span-2 relative bg-slate-200 rounded-l-3xl overflow-hidden group cursor-pointer">
            {property.images?.[0] ? (
                <Image src={property.images[0]} alt="Vue principale" fill className="object-cover transition duration-700 group-hover:scale-105" priority />
            ) : <div className="w-full h-full bg-slate-100"></div>}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
        </div>
        {property.images?.slice(1, 5).map((img, idx) => (
            <div key={idx} className="relative bg-slate-200 overflow-hidden group cursor-pointer last:rounded-br-3xl [&:nth-child(3)]:rounded-tr-3xl">
                 <Image src={img} alt={`Vue ${idx + 1}`} fill className="object-cover transition duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition"></div>
            </div>
        ))}
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-5 py-8 md:grid md:grid-cols-12 md:gap-16">
        
        {/* INFO BIEN (Gauche) */}
        <div className="md:col-span-8">
            <div className="flex flex-wrap items-center gap-2 mb-5">
                <Badge className="bg-slate-900 text-white hover:bg-slate-800 border-none px-3 py-1.5 text-[10px] uppercase tracking-widest font-black shadow-sm">
                    {property.type}
                </Badge>

                {isGhost ? (
                    <Badge className="bg-orange-50 text-orange-700 border border-orange-200 flex gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-black shadow-sm">
                        <ShieldAlert className="w-3 h-3" /> Annonce Partenaire
                    </Badge>
                ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-none flex gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-black shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Certifié Babimmo
                    </Badge>
                )}

                {property.isAvailable ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-none flex gap-1 px-3 py-1.5 text-[10px] uppercase tracking-widest font-black ml-auto md:ml-0 shadow-sm">
                        <CheckCircle className="w-3 h-3" /> Disponible
                    </Badge>
                ) : (
                    <Badge className="bg-red-50 text-red-700 border-none px-3 py-1.5 text-[10px] uppercase tracking-widest font-black ml-auto md:ml-0 shadow-sm">
                        Déjà Loué
                    </Badge>
                )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-tight tracking-tight">
                {property.title}
            </h1>
            <p className="flex items-center text-slate-500 font-medium text-lg mb-8">
                <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                {property.address}, <span className="font-bold ml-1 text-slate-700">{property.commune}</span>
            </p>

            {/* KPIs REDESIGNÉS */}
            <div className="flex justify-between md:justify-start gap-4 md:gap-8 mb-10">
                <div className="flex-1 md:flex-none bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <BedDouble className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="font-black text-2xl text-slate-900">{property.bedrooms}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Chambres</span>
                </div>
                <div className="flex-1 md:flex-none bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <Bath className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="font-black text-2xl text-slate-900">{property.bathrooms}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Douches</span>
                </div>
                <div className="flex-1 md:flex-none bg-white border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <Square className="w-6 h-6 text-orange-500 mb-2" />
                    <span className="font-black text-2xl text-slate-900">{property.surface || '-'}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">m²</span>
                </div>
            </div>

            <div className="h-px w-full bg-slate-200 mb-10" />

            {/* DESCRIPTION MAGNIFIÉE */}
            <div className="mb-12 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-xl mb-6 text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" /> À propos de ce bien
                </h3>
                {/* whitespace-pre-wrap permet de garder les retours à la ligne du post Facebook original ! */}
                <p className="text-slate-600 leading-relaxed text-base md:text-lg whitespace-pre-wrap font-medium break-words">
                    {property.description || "Aucune description détaillée n'a été fournie pour ce bien."}
                </p>
            </div>
        </div>

        {/* COLONNE DROITE : CARTE ACTION STICKY (DESKTOP) */}
        <div className="md:col-span-4 relative hidden md:block">
            <div className="sticky top-28">
                <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 overflow-hidden relative">
                    
                    <div className="flex items-end gap-2 mb-8">
                        <span className="text-4xl font-black text-slate-900">{property.price.toLocaleString()}</span>
                        <span className="text-lg font-bold text-orange-500 mb-1.5">FCFA</span>
                        <span className="text-slate-400 mb-1.5 font-medium">/ mois</span>
                    </div>

                    <ApplyButton 
                        propertyId={property.id}
                        propertyTitle={property.title}
                        isLoggedIn={isLoggedIn}
                        isAvailable={property.isAvailable}
                        price={property.price}
                    />

                    {/* Info Propriétaire */}
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                             {property.owner?.image ? (
                                <Image src={property.owner.image} width={56} height={56} alt="Proprio" />
                             ) : (
                                <User className="text-slate-400 w-6 h-6" />
                             )}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Géré par</p>
                            <p className="font-bold text-slate-900">{isGhost ? "Agence Partenaire" : property.owner?.name}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 📱 STICKY BOTTOM BAR (MOBILE CTA) */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 md:hidden flex items-center justify-between z-50 safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Loyer mensuel</p>
            <p className="text-xl font-black text-slate-900">
                {property.price.toLocaleString()} <span className="text-sm font-bold text-orange-500">FCFA</span>
            </p>
        </div>
        <div className="w-[55%]">
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
