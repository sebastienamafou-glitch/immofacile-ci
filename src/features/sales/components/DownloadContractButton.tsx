'use client';

import { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateContractData } from '@/features/sales/actions';
import { ContractData, ContractPDF } from './ContractPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';

interface Props {
  offerId: string;
}

export function DownloadContractButton({ offerId }: Props) {
  const [isFetching, setIsFetching] = useState(false);
  const [contractData, setContractData] = useState<ContractData | null>(null);

  const handleFetchData = async () => {
    setIsFetching(true);
    try {
      const data = await generateContractData(offerId);
      setContractData(data as ContractData);
      toast.success("Document juridique prêt au téléchargement.");
    } catch (error: unknown) {
      toast.error("Erreur lors de la génération des données du contrat.");
    } finally {
      setIsFetching(false);
    }
  };

  // 1. État initial : Bouton pour préparer le document
  if (!contractData) {
    return (
      <button 
        onClick={handleFetchData}
        disabled={isFetching}
        className="w-full md:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 border border-slate-700"
      >
        {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Générer le Compromis
      </button>
    );
  }

  // 2. État final : Le lien de téléchargement PDF fourni par @react-pdf/renderer
  return (
    <PDFDownloadLink 
      document={<ContractPDF data={contractData} />} 
      fileName={`${contractData.reference}.pdf`}
      className="w-full md:w-auto"
    >
      {({ loading }) => (
        <span className={`px-4 py-2 ${loading ? 'bg-slate-400' : 'bg-orange-600 hover:bg-orange-700'} text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 w-full md:w-auto`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Préparation...' : 'Télécharger le PDF'}
        </span>
      )}
    </PDFDownloadLink>
  );
}
