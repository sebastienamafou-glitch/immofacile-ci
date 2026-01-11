"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, MapPin, BedDouble, Bath, Ruler, Phone, Globe, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";

export default function PropertyFlyerPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/properties/public/${id}`);
        if (res.data.success) setProperty(res.data.property);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id]);

  if (loading || !property) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;

  // URL dynamique (sera localhost en dev, et votre vrai site en prod)
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/properties/public/${id}` : '';

  return (
    <div className="min-h-screen bg-white text-black p-0 m-0 flex justify-center font-sans">
      <div className="w-[21cm] min-h-[29.7cm] bg-white p-8 md:p-12 flex flex-col relative border border-slate-200 shadow-2xl print:shadow-none print:border-0">
        
        {/* EN-TÊTE */}
        <div className="bg-[#0B1120] text-white p-6 -mx-12 -mt-12 mb-8 text-center print:bg-black print:text-white">
            <h1 className="text-4xl font-black uppercase tracking-widest">À LOUER</h1>
            <p className="text-lg text-orange-400 font-bold mt-2">DISPONIBLE IMMÉDIATEMENT</p>
        </div>

        {/* PHOTO */}
        <div className="relative w-full h-80 bg-slate-100 mb-8 rounded-xl overflow-hidden border-4 border-black">
            {property.images?.[0] && (
                <Image src={property.images[0]} alt="Bien" fill className="object-cover" />
            )}
        </div>

        {/* INFO PRINCIPALES */}
        <div className="flex justify-between items-start mb-8 border-b-4 border-black pb-6">
            <div className="w-2/3">
                <h2 className="text-3xl font-black leading-tight mb-2 line-clamp-2">{property.title}</h2>
                <div className="flex items-center gap-2 text-xl font-bold text-slate-600">
                    <MapPin className="w-6 h-6 text-orange-500" /> {property.commune}
                </div>
            </div>
            <div className="w-1/3 text-right">
                <div className="text-4xl font-black text-black whitespace-nowrap">{property.price?.toLocaleString()} F</div>
                <div className="text-sm font-bold text-slate-500 uppercase">Par Mois</div>
            </div>
        </div>

        {/* GRILLE DETAILS */}
        <div className="grid grid-cols-3 gap-6 mb-12">
             <div className="flex flex-col items-center p-4 border-2 border-slate-200 rounded-xl">
                <BedDouble className="w-10 h-10 mb-2 text-slate-800"/>
                <span className="text-2xl font-black">{property.bedrooms}</span>
                <span className="text-xs uppercase font-bold text-slate-500">Chambres</span>
             </div>
             <div className="flex flex-col items-center p-4 border-2 border-slate-200 rounded-xl">
                <Bath className="w-10 h-10 mb-2 text-slate-800"/>
                <span className="text-2xl font-black">{property.bathrooms}</span>
                <span className="text-xs uppercase font-bold text-slate-500">Douches</span>
             </div>
             <div className="flex flex-col items-center p-4 border-2 border-slate-200 rounded-xl">
                <Ruler className="w-10 h-10 mb-2 text-slate-800"/>
                <span className="text-2xl font-black">{property.surface} m²</span>
                <span className="text-xs uppercase font-bold text-slate-500">Surface</span>
             </div>
        </div>

        {/* DESCRIPTION */}
        <div className="mb-auto">
            <h3 className="font-bold text-lg uppercase mb-2 border-l-4 border-orange-500 pl-3">Description</h3>
            <p className="text-lg leading-relaxed text-slate-700 line-clamp-5 text-justify">
                {property.description || "Un bien exceptionnel à visiter absolument. Contactez-nous pour plus d'informations et organiser une visite rapidement."}
            </p>
        </div>

        {/* CONTACT & QR CODE */}
        <div className="mt-8 bg-slate-50 rounded-3xl p-6 flex items-center gap-6 border-2 border-black print:bg-slate-50">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                {/* Le QR Code pointera vers la vraie URL une fois en ligne */}
                {publicUrl && <QRCodeSVG value={publicUrl} size={130} />}
            </div>
            
            <div className="flex-1 space-y-3">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Contact Propriétaire</p>
                    <div className="flex items-center gap-3 font-black text-3xl">
                        <Phone className="w-8 h-8 text-orange-500 fill-orange-500"/> 
                        {/* 📞 VRAI TÉLÉPHONE ICI */}
                        {property.owner?.phone || "Non renseigné"}
                    </div>
                </div>

                <div className="h-px bg-slate-300 w-full" />
                
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 font-bold text-lg text-slate-700">
                        <User className="w-5 h-5"/> {property.owner?.name || "Propriétaire"}
                    </div>
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-400">
                        <Globe className="w-4 h-4"/> immofacile.ci
                    </div>
                </div>
            </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 font-mono">
            Réf: {property.id.slice(-8).toUpperCase()} • Scannez le code pour postuler en ligne.
        </p>

      </div>
    </div>
  );
}
