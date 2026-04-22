"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { ChevronLeft, UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importPropertiesAction } from "./actions";

export default function ImportPropertiesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<unknown[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // 1. Lecture du fichier Excel côté Client
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0]; 
      const ws = wb.Sheets[wsname];
      
      // ✅ CORRECTION DU TYPE ANY ET DU MAPPING
      const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      
      // Mapping strict aligné sur le schéma Zod et le CSV de démo
      const mappedData = data.map((row) => ({
        Titre: row["Titre"] || row["titre"] || "Sans titre",
        Type: row["Type"] || row["type"] || "APPARTEMENT",
        Commune: row["Commune"] || row["commune"] || "Inconnue",
        Adresse: row["Adresse"] || row["adresse"] || "Non renseignée",
        Loyer: Number(row["Loyer"] || row["loyer"] || 0),
        Chambres: Number(row["Chambres"] || row["chambres"] || 0),
        SallesDeBain: Number(row["SallesDeBain"] || row["Salles de bain"] || 0),
        EmailProprietaire: String(row["EmailProprietaire"] || row["Email"] || "")
      }));

      setParsedData(mappedData);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // 2. Envoi du JSON propre au Serveur
  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setResult(null);

    try {
        const res = await importPropertiesAction(parsedData);
        if (res.error) {
            setResult({ success: false, error: res.error });
        } else {
            setResult({ success: true, message: res.message });
            setParsedData([]); // Reset après succès
            setFile(null);
        }
    } catch (err: unknown) {
        setResult({ success: false, error: "Erreur réseau lors de l'importation." });
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agency/properties">
          <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5 text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Importer des Biens Immobiliers</h1>
          <p className="text-slate-400 text-sm mt-1">Format accepté : .xlsx, .xls, .csv</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl space-y-8">
        
        {/* Résultat de l'importation */}
        {result?.error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm">{result.error}</span>
            </div>
        )}
        {result?.success && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm">{result.message}</span>
            </div>
        )}

        {/* Zone de Drop (Upload) */}
        {!file ? (
            <div className="border-2 border-dashed border-white/10 hover:border-orange-500/50 rounded-2xl p-12 flex flex-col items-center justify-center transition-all bg-black/20 relative group">
                <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-orange-500 mb-4 transition-colors" />
                <h3 className="text-white font-bold text-lg mb-1">Glissez votre fichier de parc immobilier ici</h3>
                <p className="text-slate-500 text-sm text-center max-w-md mt-2">
                    Votre fichier Excel doit contenir les colonnes : <br/>
                    <span className="font-mono text-xs text-orange-400">Titre, Type, Commune, Adresse, Loyer, Chambres, SallesDeBain, EmailProprietaire</span>
                </p>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-white font-bold">{file.name}</p>
                            <p className="text-slate-400 text-sm">{parsedData.length} biens détectés</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={() => { setFile(null); setParsedData([]); }} className="text-slate-400 hover:text-white">
                        Changer de fichier
                    </Button>
                </div>

                {parsedData.length > 0 && (
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleImport} 
                            disabled={isUploading}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 px-8"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UploadCloud className="w-5 h-5 mr-2" />}
                            {isUploading ? "Importation en cours..." : `Importer ${parsedData.length} biens`}
                        </Button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
