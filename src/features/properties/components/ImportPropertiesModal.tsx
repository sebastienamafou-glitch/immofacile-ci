'use client';

import { useState, useRef } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
import { Loader2, UploadCloud, FileSpreadsheet } from "lucide-react";
import { importPropertiesAction } from '../actions/importProperties';
import { PropertyType } from '@prisma/client';

export function ImportPropertiesModal() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Titre: 'Villa Duplex',
        Type: 'VILLA',
        Commune: 'Cocody',
        Adresse: 'Rue des Jardins',
        Loyer: 1500000,
        Chambres: 5,
        SallesDeBain: 4,
        EmailProprietaire: 'client@gmail.com',
      },
    ];

    const worksheet = utils.json_to_sheet(templateData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Biens');
    writeFile(workbook, 'Modele_Import_Babimmo.xlsx');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Analyse et importation en cours...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawData = utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (rawData.length === 0) {
        toast.error('Le fichier est vide.', { id: toastId });
        setIsUploading(false);
        return;
      }

      // Mapping vers le format attendu par la validation Zod du backend
      const propertiesToImport = rawData.map((row) => ({
        Titre: String(row['Titre'] || ''),
        Type: (String(row['Type']).toUpperCase() as PropertyType) || 'APPARTEMENT',
        Commune: String(row['Commune'] || ''),
        Adresse: String(row['Adresse'] || ''),
        Loyer: Number(row['Loyer']) || 0,
        Chambres: Number(row['Chambres']) || 0,
        SallesDeBain: Number(row['SallesDeBain'] || row['Salles de bain'] || 0),
        EmailProprietaire: String(row['EmailProprietaire'] || row['Email'] || ''),
      }));

      const result = await importPropertiesAction(propertiesToImport);

      if (result.success) {
        toast.success(result.message, { id: toastId });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch (error) {
      console.error('Erreur de parsing:', error);
      toast.error('Erreur lors de la lecture du fichier. Vérifiez le format.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-orange-500/10 text-orange-500 rounded-lg">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            Importer depuis Excel
          </h3>
          <p className="text-sm text-slate-400">
            Uploadez votre fichier pour générer automatiquement votre parc immobilier.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleDownloadTemplate}
          className="flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-4 text-sm font-medium text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
          type="button"
        >
          Télécharger le modèle Excel
        </button>

        <div className="relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            disabled={isUploading}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
            title="Cliquez pour uploader"
          />
          <button
            className="flex w-full items-center justify-center rounded-xl border border-transparent bg-orange-600 px-4 py-4 text-sm font-bold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-orange-600/50 transition-colors relative"
            disabled={isUploading}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <UploadCloud className="w-5 h-5 mr-2" />
            )}
            {isUploading ? 'Traitement en cours...' : 'Uploader le fichier'}
          </button>
        </div>
      </div>
    </div>
  );
}
