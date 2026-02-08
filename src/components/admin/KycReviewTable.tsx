import { prisma } from "@/lib/prisma";
import { reviewKyc } from "@/actions/kyc";

export default async function KycReviewTable() {
  // Récupérer uniquement les statuts PENDING
  const requests = await prisma.userKYC.findMany({
    where: { status: "PENDING" },
    include: { user: true } // Pour avoir le nom et l'email
  });

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {requests.map((req) => (
            <tr key={req.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{req.user.name}</div>
                <div className="text-sm text-gray-500">{req.user.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <a href={req.documents[0]} target="_blank" className="text-blue-600 hover:underline text-sm">
                  Voir la pièce
                </a>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {req.idType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <form className="inline-flex gap-2">
                  {/* Bouton VALIDER */}
                  <button 
                    formAction={async () => {
                      'use server';
                      await reviewKyc(req.id, "VERIFIED");
                    }}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full hover:bg-green-200"
                  >
                    Valider
                  </button>

                  {/* Bouton REJETER */}
                  <button 
                    formAction={async () => {
                      'use server';
                      await reviewKyc(req.id, "REJECTED", "Document illisible ou invalide");
                    }}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded-full hover:bg-red-200"
                  >
                    Rejeter
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                Aucune demande en attente.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
