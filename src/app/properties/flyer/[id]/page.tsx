import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/auth"; // Session Serveur
import { prisma } from "@/lib/prisma";
import { 
  MapPin, BedDouble, Bath, Ruler, Phone, User, Globe, Printer 
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react"; // Assurez-vous d'avoir installé ce package
import PrintButton from "@/components/ui/print-button"; // Petit composant client à créer

// Force le rendu dynamique pour avoir les données fraîches
export const dynamic = 'force-dynamic';

export default async function PropertyFlyerPage({ params }: { params: { id: string } }) {
  // 1. SÉCURITÉ & DONNÉES (Server-Side)
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // On récupère le bien et son propriétaire (pour le téléphone)
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
        owner: { select: { name: true, phone: true, email: true } }
    }
  });

  if (!property) return notFound();

  // URL absolue pour le QR Code (Utilisez votre variable d'env PROD)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${appUrl}/properties/public/${property.id}`;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white p-8 flex justify-center font-sans">
      
      {/* BOUTON D'IMPRESSION (Flottant, caché à l'impression) */}
      <div className="fixed top-6 right-6 print:hidden z-50">
         <PrintButton />
      </div>

      {/* FEUILLE A4 (21cm x 29.7cm) */}
      <div className="w-[21cm] min-h-[29.7cm] bg-white p-12 flex flex-col relative shadow-2xl print:shadow-none print:border-0 print:p-0 print:m-0">
        
        {/* EN-TÊTE */}
        <div className="bg-[#0B1120] text-white py-8 -mx-12 -mt-12 mb-8 text-center print:bg-black print:text-white print:-mx-0 print:-mt-0">
            <h1 className="text-4xl font-black uppercase tracking-[0.2em]">À LOUER</h1>
            <p className="text-lg text-orange-400 font-bold mt-2 tracking-wider">
                {property.isAvailable ? "DISPONIBLE IMMÉDIATEMENT" : "BIEN LOUÉ"}
            </p>
        </div>

        {/* PHOTO PRINCIPALE */}
        <div className="relative w-full h-80 bg-slate-100 mb-8 rounded-none border-b-8 border-black overflow-hidden print:h-72">
            {property.images?.[0] ? (
                <Image 
                    src={property.images[0]} 
                    alt="Bien Immobilier" 
                    fill 
                    className="object-cover"
                    priority 
                />
            ) : (
                <div className="flex items-center justify-center h-full bg-slate-200 text-slate-400 font-bold text-2xl">
                    PHOTO NON DISPONIBLE
                </div>
            )}
        </div>

        {/* INFO PRINCIPALES */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
            <div className="w-2/3 pr-4">
                <h2 className="text-3xl font-black leading-tight mb-2 text-slate-900 uppercase">
                    {property.title}
                </h2>
                <div className="flex items-center gap-2 text-xl font-bold text-slate-600">
                    <MapPin className="w-6 h-6 text-orange-500 shrink-0" /> 
                    {property.commune}, {property.address}
                </div>
            </div>
            <div className="w-1/3 text-right">
                <div className="text-4xl font-black text-black whitespace-nowrap tracking-tight">
                    {property.price.toLocaleString()} <span className="text-2xl text-orange-500">F</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Loyer Mensuel</div>
            </div>
        </div>

        {/* GRILLE DETAILS (KPIs) */}
        <div className="grid grid-cols-3 gap-6 mb-10">
             <div className="flex flex-col items-center p-4 border-2 border-slate-100 bg-slate-50 rounded-xl print:border-black">
                <BedDouble className="w-8 h-8 mb-2 text-slate-900"/>
                <span className="text-3xl font-black text-slate-900">{property.bedrooms}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Chambres</span>
             </div>
             <div className="flex flex-col items-center p-4 border-2 border-slate-100 bg-slate-50 rounded-xl print:border-black">
                <Bath className="w-8 h-8 mb-2 text-slate-900"/>
                <span className="text-3xl font-black text-slate-900">{property.bathrooms}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Douches</span>
             </div>
             <div className="flex flex-col items-center p-4 border-2 border-slate-100 bg-slate-50 rounded-xl print:border-black">
                <Ruler className="w-8 h-8 mb-2 text-slate-900"/>
                <span className="text-3xl font-black text-slate-900">{property.surface || '-'}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Surface (m²)</span>
             </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mb-auto">
            <h3 className="font-bold text-sm text-orange-500 uppercase mb-3 tracking-widest border-b border-orange-200 w-fit pb-1">
                Description du bien
            </h3>
            <p className="text-lg leading-relaxed text-slate-700 text-justify font-medium">
                {property.description || "Aucune description détaillée n'a été fournie pour ce bien. Veuillez contacter le propriétaire pour plus d'informations ou pour planifier une visite."}
            </p>
        </div>

        {/* CONTACT & QR CODE (Footer) */}
        <div className="mt-8 bg-slate-900 text-white rounded-3xl p-6 flex items-center gap-8 print:bg-white print:text-black print:border-2 print:border-black">
            
            {/* QR CODE */}
            <div className="bg-white p-2 rounded-xl shrink-0 print:border print:border-slate-300">
                <QRCodeSVG value={publicUrl} size={100} />
            </div>
            
            <div className="flex-1 space-y-4">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">
                        Contactez le Propriétaire
                    </p>
                    <div className="flex items-center gap-3 font-black text-3xl print:text-black">
                        <Phone className="w-6 h-6 text-orange-500 fill-orange-500"/> 
                        {property.owner?.phone || "Non renseigné"}
                    </div>
                </div>

                <div className="h-px bg-slate-700 w-full print:bg-slate-300" />
                
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 font-bold text-lg text-slate-200 print:text-slate-700">
                        <User className="w-5 h-5"/> {property.owner?.name || "Agence"}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-500 uppercase tracking-widest">
                        <Globe className="w-4 h-4"/> immofacile.ci
                    </div>
                </div>
            </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 font-mono print:mt-4">
            Réf: {property.id.slice(-8).toUpperCase()} • Scannez le code pour postuler en ligne.
        </p>

      </div>
    </div>
  );
}
