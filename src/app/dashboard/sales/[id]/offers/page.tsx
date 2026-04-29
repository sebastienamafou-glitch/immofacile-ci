import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, User, Gavel, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Ajuste l'import selon ton UI
import { acceptSaleOffer } from '@/features/sales/actions';
import { DownloadContractButton } from '@/features/sales/components/DownloadContractButton';

interface OffersPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyOffersPage(props: OffersPageProps) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // 1. Récupération du bien ET de toutes ses offres associées
  const property = await prisma.propertyForSale.findUnique({
    where: { 
      id: params.id,
      ownerId: session.user.id // SÉCURITÉ : Vérifie que c'est bien le propriétaire
    },
    include: {
      offers: {
        orderBy: { amountCfa: 'desc' }, // On affiche la meilleure offre en premier
        include: {
          buyer: {
            select: { name: true, email: true, phone: true, kyc: { select: { status: true } } }
          }
        }
      }
    }
  });

  if (!property) redirect('/dashboard/sales');

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8">
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <Link href="/dashboard/sales" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4" /> Retour à mes biens
          </Link>
          <h1 className="text-3xl font-black text-foreground">Gestion des Offres</h1>
          <p className="text-muted-foreground">Pour : {property.title}</p>
        </div>
        
        {/* LA RÉPONSE À TA QUESTION : LE LIEN VERS LA PAGE PUBLIQUE */}
        <Link 
          href={`/sales/${property.id}`} 
          target="_blank"
          className="flex items-center gap-2 bg-white/5 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Voir l'annonce publique
        </Link>
      </div>

      {/* STATISTIQUES RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-6 bg-card border rounded-2xl shadow-sm">
          <p className="text-sm text-muted-foreground font-bold uppercase">Prix demandé</p>
          <p className="text-2xl font-black">{Number(property.priceCfa).toLocaleString()} FCFA</p>
        </div>
        <div className="p-6 bg-card border rounded-2xl shadow-sm">
          <p className="text-sm text-muted-foreground font-bold uppercase">Nombre d'offres</p>
          <p className="text-2xl font-black text-orange-500">{property.offers.length}</p>
        </div>
      </div>

      {/* LISTE DES OFFRES */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Gavel className="w-5 h-5 text-orange-500" /> Offres reçues
      </h2>

      {property.offers.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
          Aucune offre d'achat n'a encore été soumise pour ce bien.
        </div>
      ) : (
        <div className="space-y-4">
          {property.offers.map((offer) => (
            <div key={offer.id} className="p-6 bg-card border rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
              
              {/* Info Acheteur */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-lg">{offer.buyer.name || 'Acheteur Anonyme'}</p>
                    {offer.buyer.kyc?.status === 'VERIFIED' && (
                      <Badge className="bg-emerald-500 text-white text-[10px] border-none px-2 py-0">KYC VERIFIÉ</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{offer.buyer.email} • {offer.buyer.phone || 'Pas de numéro'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Soumise le {new Date(offer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Montant & Action */}
              <div className="flex flex-col items-end w-full md:w-auto gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Montant proposé</p>
                  <p className="text-2xl font-black text-orange-500">{Number(offer.amountCfa).toLocaleString()} FCFA</p>
                </div>
                
                {offer.status === 'PENDING' ? (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-lg transition-colors text-sm">
                      Refuser
                    </button>
                    <form action={acceptSaleOffer.bind(null, offer.id)}>
                      <button 
                        type="submit" 
                        className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm flex items-center gap-1"
                      >
                       <CheckCircle className="w-4 h-4" /> Accepter
                      </button>
                    </form>
                  </div>
                ) : offer.status === 'ACCEPTED' ? (
                  <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                     <Badge className="bg-green-500 text-white text-sm py-1 px-3 border-none shadow-sm">
                        Offre Acceptée
                     </Badge>
                     {/* LE BOUTON DE GÉNÉRATION DU PDF */}
                     <DownloadContractButton offerId={offer.id} />
                  </div>
                ) : (
                  <Badge variant="outline" className="text-sm py-1 px-3 bg-red-50 text-red-600 border-red-200">
                    Offre Refusée
                  </Badge>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
