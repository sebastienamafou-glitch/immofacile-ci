'use client';

import { useState } from 'react';
import { ImageUpload } from '@/ui/ImageUpload';
import { submitKycDocument } from '@/features/kyc/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function KycUploadForm() {
  const [idType, setIdType] = useState('CNI');
  const [idNumber, setIdNumber] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!idNumber.trim()) {
      toast.error('Veuillez saisir le numéro de votre pièce.');
      return;
    }
    if (!uploadedUrl) {
      toast.error('Veuillez uploader le document numérisé.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await submitKycDocument(uploadedUrl, idType, idNumber);
      toast.success('Dossier soumis et chiffré avec succès.');
      router.refresh(); 
    } catch (error) {
      console.error("Erreur KYC:", error);
      toast.error('Une erreur est survenue lors de la soumission.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-6 bg-card p-6 rounded-xl border border-border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Choix du type de pièce */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Type de document</label>
          <select 
            value={idType} 
            onChange={(e) => setIdType(e.target.value)}
            className="w-full bg-background text-foreground border-input rounded-md shadow-sm p-2.5 border focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="CNI">Carte Nationale d'Identité (CNI)</option>
            <option value="PASSEPORT">Passeport</option>
            <option value="PERMIS">Permis de Conduire</option>
            <option value="ATTESTATION">Attestation d'Identité</option>
          </select>
        </div>

        {/* Numéro de la pièce */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Numéro de la pièce</label>
          <input 
            type="text" 
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
            required 
            placeholder="Ex: C0123456789"
            className="w-full bg-background text-foreground placeholder:text-muted-foreground border-input rounded-md shadow-sm p-2.5 border focus:ring-orange-500 focus:border-orange-500 font-mono" 
          />
        </div>
      </div>

      {/* Zone d'Upload / Validation */}
      <div className="pt-2 border-t border-border mt-4">
        {!uploadedUrl ? (
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Document numérisé (Recto/Verso)</label>
            <ImageUpload 
              onUploadSuccess={(url) => {
                setUploadedUrl(url);
                toast.success('Image chargée, veuillez soumettre le formulaire.');
              }} 
              buttonText="Scanner le document"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              Document sécurisé en mémoire. Prêt pour l'envoi.
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20"
            >
              {isSubmitting ? (
                <>Chiffrement en cours...</>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                  Soumettre le dossier KYC
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
