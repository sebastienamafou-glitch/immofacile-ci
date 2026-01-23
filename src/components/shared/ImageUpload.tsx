"use client";

import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  onRemove: (value: string) => void;
}

export default function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setLoading(true);
    const newUrls: string[] = [];

    // On traite chaque fichier
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
      
      // Paramètres pour Cloudinary
      const timestamp = Math.round((new Date).getTime() / 1000);
      formData.append("timestamp", timestamp.toString());
      formData.append("folder", "immofacile_listings"); // Dossier Cloudinary

      // 1. Demander la signature au serveur
      const signatureRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        body: JSON.stringify({ paramsToSign: { timestamp, folder: "immofacile_listings" } }),
      });
      const { signature } = await signatureRes.json();
      formData.append("signature", signature);

      // 2. Upload vers Cloudinary
      const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
      
      try {
        const res = await fetch(url, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) {
            newUrls.push(data.secure_url);
        }
      } catch (err) {
        console.error("Upload fail:", err);
      }
    }

    onChange([...value, ...newUrls]);
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        {value.map((url) => (
          <div key={url} className="relative w-[200px] h-[150px] rounded-lg overflow-hidden border border-slate-700">
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
              >
                <X size={14} />
              </button>
            </div>
            <Image fill className="object-cover" alt="Image" src={url} />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900 hover:bg-slate-800 transition">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {loading ? (
                <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
            ) : (
                <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
            )}
            <p className="text-sm text-slate-500">
                <span className="font-semibold">Cliquez pour uploader</span> des photos
            </p>
          </div>
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={handleUpload} 
            disabled={loading}
          />
        </label>
      </div>
    </div>
  );
}
