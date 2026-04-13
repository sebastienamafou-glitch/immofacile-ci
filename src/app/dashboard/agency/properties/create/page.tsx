"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Save, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CldUploadWidget } from "next-cloudinary";
import { createPropertyAction } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 px-8">
      {pending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
      {pending ? "Création en cours..." : "Créer le bien"}
    </Button>
  );
}

export default function CreateAgencyPropertyPage() {
  const [state, formAction] = useFormState(createPropertyAction, null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Fonction pour supprimer une image de la prévisualisation
  const removeImage = (indexToRemove: number) => {
    setImageUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      
      {/* HEADER STRICT */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agency">
          <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5 text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Ajouter un bien
            <span className="bg-orange-500/10 text-orange-500 text-[10px] uppercase px-2 py-1 rounded-full border border-orange-500/20">Agence</span>
          </h1>
        </div>
      </div>

      {/* FORMULAIRE */}
      <form action={formAction} className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl space-y-8">
        
        {state?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-bold">
                {state.error}
            </div>
        )}

        {/* --- SECTION PHOTOS (CLOUDINARY) --- */}
        <div className="space-y-4">
            <div>
                <Label className="text-slate-300 font-bold text-lg">Photos du bien</Label>
                <p className="text-slate-500 text-sm">Ajoutez des photos lumineuses pour mettre en valeur votre annonce.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Prévisualisation des images uploadées */}
                {imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10">
                        <Image src={url} alt={`Photo ${index + 1}`} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                type="button" 
                                onClick={() => removeImage(index)}
                                className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Widget d'Upload Cloudinary */}
                <CldUploadWidget 
                    uploadPreset="immovacile_preset"
                    options={{ 
                        maxFiles: 10, // Limiter à 10 photos par bien par exemple
                        clientAllowedFormats: ["png", "jpg", "jpeg", "webp"], // Interdire les PDF pour des photos de maison !
                        sources: ['local', 'camera', 'unsplash'], // Permettre la galerie
                        multiple: true // Permettre l'upload par lot
                    }}
                    onSuccess={(result: any) => {
                        if (result?.info?.secure_url) {
                            setImageUrls((prev) => [...prev, result.info.secure_url]);
                        }
                    }}
                >
                    {({ open }) => (
                        <button
                            type="button"
                            onClick={() => open()}
                            className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-orange-500 transition-all"
                        >
                            <ImagePlus size={24} />
                            <span className="text-xs font-bold uppercase tracking-wider">Ajouter</span>
                        </button>
                    )}
                </CldUploadWidget>
            </div>

            {/* 🔒 INJECTION CACHÉE DES URLs POUR LA SERVER ACTION */}
            {imageUrls.map((url, index) => (
                <input key={index} type="hidden" name="images" value={url} />
            ))}
        </div>

        <hr className="border-white/5" />

        {/* --- SECTION INFOS TEXTUELLES --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label className="text-slate-300">Titre de l'annonce *</Label>
                <Input name="title" required placeholder="Ex: Villa Duplex Cocody" className="bg-black/50 border-white/10 text-white" />
            </div>
            
            <div className="space-y-2">
                <Label className="text-slate-300">Type de bien *</Label>
                <select name="type" required className="w-full h-10 px-3 rounded-md bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="APPARTEMENT">Appartement</option>
                    <option value="VILLA">Villa</option>
                    <option value="STUDIO">Studio</option>
                    <option value="BUREAU">Bureau</option>
                </select>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Loyer / Prix *</Label>
                <Input name="price" type="number" required placeholder="En FCFA" className="bg-black/50 border-white/10 text-white" />
            </div>

            <div className="space-y-2">
                <Label className="text-slate-300">Commune *</Label>
                <Input name="commune" required placeholder="Ex: Cocody" className="bg-black/50 border-white/10 text-white" />
            </div>

            <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">Adresse complète *</Label>
                <Input name="address" required placeholder="Ex: Angré 8ème Tranche, près de..." className="bg-black/50 border-white/10 text-white" />
            </div>

            <div className="grid grid-cols-3 gap-4 md:col-span-2">
                <div className="space-y-2">
                    <Label className="text-slate-300">Chambres</Label>
                    <Input name="bedrooms" type="number" defaultValue={0} className="bg-black/50 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Salles de bain</Label>
                    <Input name="bathrooms" type="number" defaultValue={0} className="bg-black/50 border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-300">Surface (m²)</Label>
                    <Input name="surface" type="number" defaultValue={0} className="bg-black/50 border-white/10 text-white" />
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
            <SubmitButton />
        </div>
      </form>
    </div>
  );
}
