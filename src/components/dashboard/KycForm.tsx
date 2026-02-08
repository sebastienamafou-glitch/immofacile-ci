'use client'

import { useState } from "react";
import { submitKycApplication } from "@/actions/kyc";
import { CldUploadWidget } from "next-cloudinary";

export default function KycForm() {
  const [loading, setLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(""); // Stocke l'URL reçue de Cloudinary

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadedUrl) {
        alert("Veuillez télécharger votre pièce d'identité avant d'envoyer.");
        return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    // Le champ caché "documentUrl" contient déjà l'URL grâce au state,
    // donc le Server Action le recevra automatiquement.
    
    const result = await submitKycApplication(formData);
    
    if (result.success) {
        alert("Succès : " + result.success);
        setUploadedUrl(""); // Reset
    } else {
        alert("Erreur : " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white shadow rounded-lg max-w-lg border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Vérification d'Identité (KYC)</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SÉLECTEUR TYPE */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Type de document</label>
          <select name="idType" className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="CNI">Carte Nationale d'Identité</option>
            <option value="PASSPORT">Passeport</option>
            <option value="VOTE_CARD">Carte d'Électeur</option>
          </select>
        </div>

        {/* WIDGET CLOUDINARY */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Votre Pièce (Recto/Verso)</label>
          
          <CldUploadWidget 
            uploadPreset="immofacile_kyc" // ⚠️ Mettez le nom de votre preset 'Unsigned' ici
            onSuccess={(result: any) => {
                console.log("Upload succès:", result.info);
                setUploadedUrl(result.info.secure_url); // On capture l'URL
            }}
            options={{
                sources: ['local', 'camera'],
                multiple: false,
                maxFiles: 1,
                resourceType: "image", // ou "auto" pour accepter les PDF
                clientAllowedFormats: ["png", "jpeg", "jpg", "pdf"],
                maxFileSize: 5000000, // 5MB max
            }}
          >
            {({ open }) => {
              return (
                <div 
                    onClick={() => open()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
                >
                    {uploadedUrl ? (
                        <div className="text-center">
                            <p className="text-green-600 font-bold mb-2">✅ Document chargé !</p>
                            <img src={uploadedUrl} alt="Aperçu" className="h-24 w-auto object-contain mx-auto border rounded" />
                            <p className="text-xs text-gray-400 mt-2">Cliquez pour changer</p>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <svg className="mx-auto h-10 w-10 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="font-medium">Cliquez pour uploader</span>
                            <p className="text-xs mt-1">JPG, PNG ou PDF (Max 5Mo)</p>
                        </div>
                    )}
                </div>
              );
            }}
          </CldUploadWidget>

          {/* CHAMP CACHÉ : C'est lui qui envoie l'URL au serveur */}
          <input type="hidden" name="documentUrl" value={uploadedUrl} />
        </div>

        {/* BOUTON D'ENVOI */}
        <button 
            type="submit" 
            disabled={loading || !uploadedUrl}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Traitement en cours..." : "Envoyer mon dossier"}
        </button>
      </form>
    </div>
  );
}
