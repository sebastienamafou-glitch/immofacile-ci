import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PropertyGallery from "@/components/property/PropertyGallery";
import { OfferButton } from "@/components/property/OfferButton";
import { 
  MapPin, Square, ShieldCheck, Info, Gavel, 
  ArrowLeft, Calendar, FileText
} from "lucide-react";
import Link from "next/link";
import { CostCalculator } from "@/features/sales/components/CostCalculator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage(props: PageProps) {
    const params = await props.params;
    const session = await auth();

    const property = await prisma.propertyForSale.findUnique({
        where: { id: params.id },
        include: { 
            owner: { 
                select: { name: true, kyc: { select: { status: true } } } 
            } 
        }
    });

    if (!property) notFound();

    const isVerified = property.owner?.kyc?.status === 'VERIFIED';
    const userKycStatus = session?.user?.id 
        ? await prisma.userKYC.findUnique({ where: { userId: session.user.id }, select: { status: true } })
        : null;

    return (
        <div className="min-h-screen bg-[#0B1120] text-white">
            {/* NAVIGATION & HEADER */}
            <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
                <Link href="/sales" className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-500 transition-colors mb-8 group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Retour aux annonces
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">À Vendre</span>
                            {isVerified && (
                                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase">
                                    <ShieldCheck className="w-3 h-3" /> Titre Vérifié
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">{property.title}</h1>
                        <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span className="font-bold uppercase tracking-widest text-sm">{property.location}</span>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Prix de vente</p>
                        <p className="text-4xl font-black text-orange-500">
                            {Number(property.priceCfa).toLocaleString()} <span className="text-lg">FCFA</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* GALLERY COMPONENT (Réutilisé de la location) */}
            <section className="max-w-7xl mx-auto px-4 mb-12">
                <PropertyGallery images={property.images} title={property.title} />
            </section>

            {/* CONTENT GRID */}
            <main className="max-w-7xl mx-auto px-4 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    {/* Caractéristiques */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-slate-800 p-4 rounded-2xl">
                            <Square className="w-5 h-5 text-orange-500 mb-2" />
                            <p className="text-xs text-slate-500 font-bold uppercase">Surface</p>
                            <p className="font-black">{property.surfaceArea} m²</p>
                        </div>
                        <div className="bg-white/5 border border-slate-800 p-4 rounded-2xl">
                            <FileText className="w-5 h-5 text-orange-500 mb-2" />
                            <p className="text-xs text-slate-500 font-bold uppercase">Statut Légal</p>
                            <p className="font-black">{property.legalStatus.replace('_', ' ')}</p>
                        </div>
                        <div className="bg-white/5 border border-slate-800 p-4 rounded-2xl">
                            <Calendar className="w-5 h-5 text-orange-500 mb-2" />
                            <p className="text-xs text-slate-500 font-bold uppercase">Publication</p>
                            <p className="font-black">{new Date(property.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black">Description du bien</h2>
                        <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                            {property.description}
                        </p>
                    </div>
                </div>

                {/* SIDEBAR : ACTIONS */}
                <aside className="space-y-6">
                    <div className="bg-white/5 border border-slate-800 p-8 rounded-3xl sticky top-24">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                            <Gavel className="w-6 h-6 text-orange-500" />
                            Transaction
                        </h3>
                        
                        <div className="space-y-4">
                            <OfferButton 
                                propertyId={property.id}
                                propertyTitle={property.title}
                                minPrice={Number(property.priceCfa)}
                                userKycStatus={userKycStatus?.status}
                                isLoggedIn={!!session}
                            />
                            
                            <p className="text-[10px] text-slate-500 text-center leading-relaxed italic">
                                En faisant une offre, vous vous engagez à respecter les conditions générales de vente de Babimmo.
                            </p>
                        </div>
                    </div>

                    {/* L'INTÉGRATION DU CALCULATEUR ICI */}
                    <CostCalculator initialPrice={Number(property.priceCfa)} />

                </aside>
            </main>
        </div>
    );
}
