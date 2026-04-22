"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { ChevronLeft, UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importTenantsAction } from "./actions";

export default function ImportTenantsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<unknown[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // 1. GÉNÉRATION DU MODÈLE EXCEL À LA VOLÉE
  const downloadTemplate = () => {
    const templateData = [
      { name: "Jean Dupont", email: "jean.dupont@email.com", phone: "0102030405", address: "Abidjan, Cocody" },
      { name: "Marie Curie", email: "marie@email.com", phone: "", address: "Marcory" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locataires");
    XLSX.writeFile(wb, "modele_import_locataires.xlsx");
  };

  // 2. LECTURE DU FICHIER UPLOADÉ
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
      
      const data = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      
      const mappedData = data.map((row) => ({
        name: row.name || row.Nom || "",
        email: row.email || row.Email || null,
        phone: row.phone || row.Téléphone || row.Telephone || null,
        address: row.address || row.Adresse || null
      }));
      
      setParsedData(mappedData);
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // 3. ENVOI DES DONNÉES À LA SERVER ACTION
  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setResult(null);

    try {
      const res = await importTenantsAction(parsedData);
      setResult(res);
      if (res.success) {
        setFile(null);
        setParsedData([]);
      }
    } catch (error) {
       setResult({ error: "Une erreur inattendue est survenue lors de l'importation." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* EN-TÊTE & BOUTON MODÈLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/agency/contracts">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Import Locataires</h1>
            <p className="text-slate-400">Importez vos locataires en masse via Excel ou CSV</p>
          </div>
        </div>
        
        <Button 
            onClick={downloadTemplate} 
            variant="outline" 
            className="border-purple-500/50 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger le modèle Excel
        </Button>
      </div>

      {/* ALERTES RÉSULTATS */}
      {result && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {result.success ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
          <div>
            <p className="font-bold">{result.success ? 'Succès' : 'Erreur'}</p>
            <p className="text-sm opacity-90">{result.message || result.error}</p>
          </div>
        </div>
      )}

      {/* ZONE D'UPLOAD */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 space-y-8 shadow-xl">
        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-2xl cursor-pointer bg-[#0B1120] hover:bg-slate-900/50 transition-all group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-purple-500 mb-4 transition-colors" />
              <p className="mb-2 text-sm text-slate-400 font-bold">
                <span className="text-purple-500">Cliquez pour uploader</span> ou glissez-déposez
              </p>
              <p className="text-xs text-slate-500">Fichiers supportés : .xlsx, .csv</p>
            </div>
            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </label>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between p-4 bg-[#0B1120] rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white font-bold">{file.name}</p>
                  <p className="text-slate-400 text-sm">{parsedData.length} lignes détectées</p>
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
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 px-8 shadow-lg shadow-purple-900/20 transition-all"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UploadCloud className="w-5 h-5 mr-2" />}
                  {isUploading ? "Importation en cours..." : `Importer ${parsedData.length} locataires`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
