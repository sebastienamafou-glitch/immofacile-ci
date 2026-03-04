"use client";

import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import SecureDocumentUpload from "@/components/shared/SecureDocumentUpload"; // 👈 Ajuste le chemin si besoin

export default function KycForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    idType: "CNI",
    idNumber: "",
    documentKey: "" // C'est la clé S3 que ton composant va nous renvoyer
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idNumber || !formData.documentKey) {
      return toast.error("Veuillez remplir le numéro et sécuriser votre document.");
    }

    setLoading(true);

    try {
      const res = await fetch("/api/ambassador/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Dossier KYC soumis avec succès !");
        router.refresh(); // Recharge la page pour afficher l'état "PENDING"
      } else {
        toast.error(data.error || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Impossible de joindre le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Type de pièce</label>
          <select 
            value={formData.idType}
            onChange={(e) => setFormData({...formData, idType: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-orange-500 transition"
          >
            <option value="CNI">Carte Nationale d'Identité</option>
            <option value="PASSPORT">Passeport</option>
            <option value="ATTESTATION">Attestation d'Identité</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Numéro de la pièce</label>
          <input 
            type="text" 
            placeholder="Ex: C0123456789"
            required
            value={formData.idNumber}
            onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-orange-500 transition"
          />
        </div>
      </div>

      <div className="pt-2">
        {/* 🔥 Ton composant ultra-sécurisé entre en scène */}
        <SecureDocumentUpload 
            label="Photo de la pièce (Recto)"
            onUploadComplete={(fileKey) => setFormData({ ...formData, documentKey: fileKey })}
        />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button 
          type="submit" 
          disabled={loading || !formData.documentKey}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-400 text-slate-900 font-black px-8 py-4 rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 uppercase tracking-wide"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Soumettre pour vérification"} 
          {!loading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>

    </form>
  );
}
