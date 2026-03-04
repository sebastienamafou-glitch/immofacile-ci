import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Home, MapPin, Eye, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/shared/BackButton";

export const dynamic = 'force-dynamic';

export default async function AmbassadorPropertiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // On récupère toutes les annonces appartenant à cet Ambassadeur
  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      
      {/* HEADER AVEC BOUTON RETOUR ET AJOUT */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <BackButton /> {/* ✅ Intégré ici proprement */}
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight mt-2">
            <Home className="text-orange-500 w-8 h-8" />
            Mes Biens Revendiqués
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez vos annonces ou ajoutez-en de nouvelles.</p>
        </div>
        <Link href="/dashboard/ambassador/properties/new">
          <button className="bg-orange-500 hover:bg-orange-400 text-[#0B1120] font-black px-6 py-3 rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 flex items-center gap-2 uppercase tracking-wide text-sm">
            + Nouvelle Annonce
          </button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
          <Home className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun bien revendiqué</h3>
          <p className="text-slate-500 mb-6">Parcourez les annonces partenaires et cliquez sur "C'est mon annonce" pour commencer.</p>
          <Link href="/properties">
            <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition">
              Trouver des annonces
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col">
              
              {/* Image Thumbnail */}
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                {property.images && property.images.length > 0 ? (
                  <Image 
                    src={property.images[0]} 
                    alt={property.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Home className="w-8 h-8 opacity-20" />
                  </div>
                )}
                
                {/* Badges sur l'image */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-slate-900/80 backdrop-blur-md text-white border-none shadow-sm">
                    {property.type}
                  </Badge>
                  {property.isPublished ? (
                    <Badge className="bg-emerald-500/90 backdrop-blur-md text-white border-none shadow-sm">En ligne</Badge>
                  ) : (
                    <Badge className="bg-slate-500/90 backdrop-blur-md text-white border-none shadow-sm">Brouillon</Badge>
                  )}
                </div>
              </div>

              {/* Contenu */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-1" title={property.title}>
                  {property.title}
                </h3>
                
                <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-4 font-medium">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  {property.commune}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Loyer mensuel</p>
                    <p className="font-black text-slate-900">{property.price.toLocaleString()} FCFA</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100" title="Vues réelles">
                      <Eye className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">{property.views}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Link href={`/properties/${property.id}`} target="_blank" className="flex-1">
                    <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold py-2.5 rounded-xl transition border border-slate-200 flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Voir
                    </button>
                  </Link>
                  <Link href={`/dashboard/ambassador/properties/${property.id}/edit`} className="flex-1">
                    <button className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-bold py-2.5 rounded-xl transition border border-orange-200 flex items-center justify-center gap-2">
                      Modifier
                    </button>
                  </Link>
                </div>
                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
