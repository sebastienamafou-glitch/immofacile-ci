"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, CheckCircle2, Loader2, Camera, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // Assurez-vous que api gère le content-type multipart automatiquement ou utilisez fetch standard pour l'upload

interface CompleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSuccess: () => void;
}

export default function CompleteJobModal({ isOpen, onClose, jobId, onSuccess }: CompleteJobModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'BEFORE' | 'AFTER' | null>(null);
  
  // URLs des photos stockées sur Cloudinary
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);

  // Références pour déclencher les inputs cachés
  const inputBeforeRef = useRef<HTMLInputElement>(null);
  const inputAfterRef = useRef<HTMLInputElement>(null);

  // --- 1. GESTION DE L'UPLOAD RÉEL ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      setUploading(type);

      const formData = new FormData();
      formData.append("file", file);

      try {
          // Appel à la route API créée à l'étape 1
          // Note : Si vous utilisez axios/api wrapper, assurez-vous qu'il ne force pas le JSON
          const res = await fetch('/api/upload', {
              method: 'POST',
              headers: {
                  'x-user-id': 'temp-id-handled-by-middleware', // Le middleware ajoutera le vrai ID si vous passez par lui, sinon axios le fait.
                  // Ne pas mettre 'Content-Type': 'multipart/form-data', le navigateur le fait seul avec les boundaries
              },
              body: formData
          });

          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Erreur upload");

          // Ajout de l'URL reçue dans le state
          if (type === 'BEFORE') setPhotosBefore(prev => [...prev, data.url]);
          else setPhotosAfter(prev => [...prev, data.url]);

          toast.success("Photo téléchargée !");

      } catch (error) {
          console.error(error);
          toast.error("Impossible d'envoyer la photo.");
      } finally {
          setUploading(null);
          // Reset de l'input pour permettre de ré-uploader le même fichier si besoin
          e.target.value = "";
      }
  };

  // --- 2. SUPPRESSION PHOTO ---
  const removePhoto = (url: string, type: 'BEFORE' | 'AFTER') => {
      if (type === 'BEFORE') setPhotosBefore(prev => prev.filter(p => p !== url));
      else setPhotosAfter(prev => prev.filter(p => p !== url));
  };

  // --- 3. SOUMISSION FINALE ---
  const handleSubmit = async () => {
    if (photosBefore.length === 0 || photosAfter.length === 0) {
        return toast.error("Preuves manquantes : 1 photo AVANT et 1 photo APRÈS minimum.");
    }

    setSubmitting(true);
    try {
        await api.post('/artisan/jobs/action', {
            jobId,
            action: 'COMPLETE',
            photosBefore,
            photosAfter
        });
        toast.success("Chantier clôturé avec succès !");
        onSuccess();
        onClose();
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Erreur lors de la clôture.");
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0F172A] border-slate-800 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Clôture de chantier
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Importez les photos réelles pour valider l'intervention.
          </DialogDescription>
        </DialogHeader>

        {/* INPUTS CACHÉS */}
        <input type="file" ref={inputBeforeRef} onChange={(e) => handleFileUpload(e, 'BEFORE')} className="hidden" accept="image/*" />
        <input type="file" ref={inputAfterRef} onChange={(e) => handleFileUpload(e, 'AFTER')} className="hidden" accept="image/*" />

        <div className="grid grid-cols-2 gap-4 py-4">
            
            {/* ZONE AVANT */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700 hover:border-orange-500/50 transition flex flex-col h-full">
                <h4 className="text-xs font-black uppercase text-orange-500 mb-3 text-center">📸 État Initial (Avant)</h4>
                
                <div className="flex-1 min-h-[100px] mb-3">
                    {photosBefore.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {photosBefore.map((url, i) => (
                                <div key={i} className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden group">
                                    <img src={url} alt="Avant" className="object-cover w-full h-full" />
                                    <button onClick={() => removePhoto(url, 'BEFORE')} className="absolute top-1 right-1 bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                                        <X className="w-3 h-3 text-white"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600">
                            <Camera className="w-8 h-8 opacity-20" />
                        </div>
                    )}
                </div>
                
                <Button 
                    onClick={() => inputBeforeRef.current?.click()} 
                    disabled={uploading === 'BEFORE'}
                    variant="outline" size="sm" className="w-full text-xs border-slate-700 hover:bg-slate-800"
                >
                    {uploading === 'BEFORE' ? <Loader2 className="w-3 h-3 animate-spin mr-2"/> : <UploadCloud className="w-3 h-3 mr-2" />}
                    {uploading === 'BEFORE' ? "Envoi..." : "Ajouter Photo"}
                </Button>
            </div>

            {/* ZONE APRÈS */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/50 transition flex flex-col h-full">
                <h4 className="text-xs font-black uppercase text-emerald-500 mb-3 text-center">✨ Résultat Final (Après)</h4>
                
                <div className="flex-1 min-h-[100px] mb-3">
                    {photosAfter.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {photosAfter.map((url, i) => (
                                <div key={i} className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden group">
                                    <img src={url} alt="Après" className="object-cover w-full h-full" />
                                    <button onClick={() => removePhoto(url, 'AFTER')} className="absolute top-1 right-1 bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                                        <X className="w-3 h-3 text-white"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                        </div>
                    )}
                </div>
                
                <Button 
                    onClick={() => inputAfterRef.current?.click()} 
                    disabled={uploading === 'AFTER'}
                    variant="outline" size="sm" className="w-full text-xs border-slate-700 hover:bg-slate-800"
                >
                    {uploading === 'AFTER' ? <Loader2 className="w-3 h-3 animate-spin mr-2"/> : <UploadCloud className="w-3 h-3 mr-2" />}
                    {uploading === 'AFTER' ? "Envoi..." : "Ajouter Photo"}
                </Button>
            </div>
        </div>

        <Button 
            onClick={handleSubmit} 
            disabled={submitting || photosBefore.length === 0 || photosAfter.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 text-lg"
        >
            {submitting ? <Loader2 className="animate-spin" /> : "VALIDER ET TERMINER"}
        </Button>

      </DialogContent>
    </Dialog>
  );
}
