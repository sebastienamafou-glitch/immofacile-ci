"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, Loader2, X, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { getSecureUploadUrl } from "@/actions/storage"; // Assurez-vous d'avoir créé ce fichier à l'étape précédente

interface SecureDocumentUploadProps {
  label: string;
  onUploadComplete: (fileKey: string) => void;
  acceptedTypes?: string; // ex: "image/*,application/pdf"
  maxSizeMb?: number;
}

export default function SecureDocumentUpload({ 
  label, 
  onUploadComplete, 
  acceptedTypes = "image/jpeg,image/png,application/pdf",
  maxSizeMb = 5
}: SecureDocumentUploadProps) {
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validation taille
      if (selectedFile.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Le fichier est trop lourd (Max ${maxSizeMb}MB)`);
        return;
      }
      
      setFile(selectedFile);
      setIsSuccess(false); // Reset si on change de fichier
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Sécurisation et envoi du document...");

    try {
      // 1. Demander la permission au serveur (Signed URL)
      const presignedData = await getSecureUploadUrl(file.name, file.type);
      
      if (presignedData.error || !presignedData.url) {
        throw new Error(presignedData.error || "Erreur d'autorisation");
      }

      // 2. Upload direct vers S3 (Bypass le serveur Next.js pour la perf)
      const uploadResponse = await fetch(presignedData.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Échec de l'envoi vers le coffre-fort S3");
      }

      // 3. Succès ! On notifie le parent
      setIsSuccess(true);
      onUploadComplete(presignedData.fileKey); // ✅ C'est ici qu'on renvoie la clé magique
      
      toast.success("Document sécurisé avec succès !", { id: toastId });

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur d'upload", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setIsSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="border border-slate-700 bg-slate-900/50 rounded-xl p-6 relative group transition-all hover:border-slate-600">
      
      <div className="flex justify-between items-start mb-4">
        <div>
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
                {isSuccess ? <CheckCircle className="w-4 h-4 text-emerald-500"/> : <FileText className="w-4 h-4 text-slate-400"/>}
                {label}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
               <Lock className="w-3 h-3"/> Stockage Chiffré S3 (Privé)
            </p>
        </div>
        {file && !isSuccess && (
            <button onClick={reset} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
            </button>
        )}
      </div>

      {!file ? (
        // ÉTAT 1 : SÉLECTION
        <div 
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition hover:border-indigo-500/50"
        >
            <UploadCloud className="w-8 h-8 text-slate-500 mb-2 group-hover:text-indigo-400 transition" />
            <p className="text-xs text-slate-400 font-medium">Cliquez pour sélectionner</p>
            <p className="text-[10px] text-slate-600 mt-1">PDF, JPG, PNG (Max {maxSizeMb}Mo)</p>
            <input 
                type="file" 
                ref={inputRef} 
                onChange={handleFileSelect} 
                accept={acceptedTypes} 
                className="hidden" 
            />
        </div>
      ) : (
        // ÉTAT 2 : FICHIER SÉLECTIONNÉ OU UPLOADÉ
        <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-300 uppercase">{file.name.split('.').pop()}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            </div>

            {isSuccess ? (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold py-2 rounded text-center flex items-center justify-center gap-2">
                    <Shield className="w-3 h-3" /> Fichier Sécurisé & Envoyé
                </div>
            ) : (
                <button 
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded transition flex items-center justify-center gap-2"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer vers le Coffre-fort"}
                </button>
            )}
        </div>
      )}
    </div>
  );
}
