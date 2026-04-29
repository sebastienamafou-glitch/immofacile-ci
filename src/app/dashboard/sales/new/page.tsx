import { KycPageGuard } from '@/features/kyc/components/KycPageGuard';
import { createPropertyForSale } from '@/features/sales/actions';
import { IvorianLegalStatus } from '@prisma/client';

export default function NewSalePage() {
  return (
    <KycPageGuard>
      <main className="max-w-3xl mx-auto p-6 mt-8 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mettre un bien en vente</h1>
          <p className="text-sm text-gray-500 mt-1">Votre identité est vérifiée. Vous pouvez publier une annonce sécurisée.</p>
        </div>

        <form action={createPropertyForSale} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'annonce</label>
              <input 
                type="text" 
                name="title" 
                required 
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Ex: Terrain 500m2 Bingerville" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA)</label>
              <input 
                type="number" 
                name="priceCfa" 
                required 
                min="0" 
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Ex: 15000000" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surface (m²)</label>
              <input 
                type="number" 
                name="surfaceArea" 
                required 
                min="0" 
                step="0.1" 
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Ex: 500" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Localisation précise</label>
              <input 
                type="text" 
                name="location" 
                required 
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500" 
                placeholder="Ex: Carrefour Feh Kessé, Bingerville" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut Légal Ivoirien (Garantie)</label>
              <select 
                name="legalStatus" 
                required 
                className="w-full bg-white text-gray-900 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={IvorianLegalStatus.ACD}>ACD (Arrêté de Concession Définitive) - Sécurité Max</option>
                <option value={IvorianLegalStatus.TITRE_FONCIER}>Titre Foncier</option>
                <option value={IvorianLegalStatus.CERTIFICAT_MOUCHETE}>Certificat de Propriété (Moucheté)</option>
                <option value={IvorianLegalStatus.LETTRE_ATTRIBUTION}>Lettre d'Attribution</option>
                <option value={IvorianLegalStatus.ATTESTATION_VILLAGEOISE}>Attestation Villageoise (Approbation requise)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
              <textarea 
                name="description" 
                required 
                rows={4} 
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 rounded-md shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                placeholder="Décrivez les atouts du bien..."
              ></textarea>
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Publier l'annonce
          </button>
        </form>
      </main>
    </KycPageGuard>
  );
}
