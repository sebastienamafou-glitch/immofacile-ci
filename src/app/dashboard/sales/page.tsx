import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SaleTransactionStep } from '@prisma/client';

// Helper pour le formatage du prix en CFA
const formatCfa = (amount: number) => {
  return new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);
};

// Helper pour afficher des badges de statut propres
const getStatusBadge = (status: SaleTransactionStep) => {
  // Ajout du typage strict Record<SaleTransactionStep, string>
  const styles: Record<SaleTransactionStep, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    OFFER_PENDING: 'bg-yellow-100 text-yellow-800',
    OFFER_ACCEPTED: 'bg-blue-100 text-blue-800',
    COMPROMIS_SIGNED: 'bg-purple-100 text-purple-800',
    ACTE_AUTHENTIQUE_SIGNED: 'bg-indigo-100 text-indigo-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Récupération des biens de l'utilisateur, triés par date de création
  const properties = await prisma.propertyForSale.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="max-w-6xl mx-auto p-6 mt-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes biens en vente</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez vos annonces et suivez les transactions.</p>
        </div>
        <Link 
          href="/dashboard/sales/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          + Nouvelle annonce
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🏗️
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bien en vente</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">Vous n'avez pas encore publié d'annonce immobilière. Commencez dès maintenant en ajoutant votre premier terrain ou maison.</p>
          <Link href="/dashboard/sales/new" className="text-blue-600 font-medium hover:underline">
            Publier mon premier bien &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-3">
                  {getStatusBadge(property.status)}
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    {property.legalStatus.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={property.title}>
                  {property.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4 truncate">{property.location}</p>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span className="font-medium mr-2">Surface:</span> {property.surfaceArea} m²
                </div>
                <div className="text-xl font-bold text-blue-600 mt-4">
                  {formatCfa(Number(property.priceCfa))}
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-end">
                <button className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Voir les offres &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
