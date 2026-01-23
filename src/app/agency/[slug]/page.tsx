import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Mail, Phone, MapPin, ShieldCheck, Globe } from "lucide-react"; // ✅ Imports nettoyés
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicListingCard from "@/components/public/PublicListingCard";
import PublicPropertyCard from "@/components/public/PublicPropertyCard";
import Image from "next/image";

// ✅ SEO Dynamique
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const agency = await prisma.agency.findUnique({ where: { slug } });
  return {
    title: agency ? `${agency.name} - Vitrine ImmoFacile` : "Agence Introuvable",
    description: `Découvrez les biens immobiliers de ${agency?.name || "l'agence"}.`
  };
}

export default async function AgencyPublicPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // 1. Récupération de l'Agence et de TOUS ses biens publiés
  const agency = await prisma.agency.findUnique({
    where: { slug },
    include: {
        listings: {
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' }
        },
        properties: {
            where: { isPublished: true },
            include: { leases: { where: { isActive: true } } },
            orderBy: { createdAt: 'desc' }
        }
    }
  });

  if (!agency) return notFound();

  const brandColor = agency.primaryColor || "#FF7900"; 

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
         <div 
            className="absolute top-0 right-0 w-2/3 h-full opacity-10 blur-3xl rounded-full transform translate-x-1/4 -translate-y-1/4"
            style={{ backgroundColor: brandColor }}
         />
         
         <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
                
                {/* Logo */}
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl shadow-2xl flex items-center justify-center p-4 shrink-0">
                    {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt={agency.name} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-3xl font-black text-slate-800 uppercase">
                            {agency.name.substring(0,2)}
                        </span>
                    )}
                </div>

                {/* Infos Agence */}
                <div className="text-center md:text-left flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight">{agency.name}</h1>
                        {/* ✅ CORRECTION ICI : Retrait de title="..." qui faisait planter TS */}
                        {agency.isActive && (
                            <div title="Agence Vérifiée">
                                <ShieldCheck className="text-blue-400 w-8 h-8" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 mt-4 font-medium">
                        {agency.email && (
                            <a href={`mailto:${agency.email}`} className="flex items-center gap-2 hover:text-white transition">
                                <Mail size={18} /> {agency.email}
                            </a>
                        )}
                        {agency.phone && (
                            <a href={`tel:${agency.phone}`} className="flex items-center gap-2 hover:text-white transition">
                                <Phone size={18} /> {agency.phone}
                            </a>
                        )}
                        <span className="flex items-center gap-2">
                             <Globe size={18} /> {agency.slug}.immofacile.ci
                        </span>
                    </div>
                </div>

                {/* Call To Action */}
                <div>
                     <Button size="lg" className="font-bold text-white shadow-lg h-12 px-8 text-lg" style={{ backgroundColor: brandColor }}>
                        Contacter l'agence
                     </Button>
                </div>
            </div>
         </div>
      </div>

      {/* --- CONTENU (ONGLETS) --- */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 min-h-[500px]">
            
            <Tabs defaultValue="short_term" className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-100 pb-4 gap-4">
                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="short_term" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 font-bold">
                            🌴 Séjours (Akwaba)
                        </TabsTrigger>
                        <TabsTrigger value="long_term" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 font-bold">
                            🏢 Vente & Location
                        </TabsTrigger>
                    </TabsList>
                    <span className="text-sm font-bold text-slate-400">
                        {agency.listings.length + agency.properties.length} offres disponibles
                    </span>
                </div>

                {/* TAB 1: COURT SÉJOUR */}
                <TabsContent value="short_term" className="space-y-6 animate-in fade-in-50">
                    {agency.listings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {agency.listings.map((listing: any) => (
                                <PublicListingCard key={listing.id} listing={listing} primaryColor={brandColor} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                            <MapPin className="w-12 h-12 mb-4 opacity-20" />
                            <p>Aucune offre de séjour pour le moment.</p>
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: LONG TERME */}
                <TabsContent value="long_term" className="space-y-6 animate-in fade-in-50">
                    {agency.properties.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {agency.properties.map((prop: any) => (
                                <PublicPropertyCard key={prop.id} property={prop} primaryColor={brandColor} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
                            <p>Aucun bien en gestion pour le moment.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

        </div>
      </div>

    </div>
  );
}
