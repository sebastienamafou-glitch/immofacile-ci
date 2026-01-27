"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ✅ TYPAGE STRICT
interface PropertyTaxSummary {
    id: string;
    title: string;
    commune: string;
    rev: number;
    exp: number;
    net: number;
}

interface TaxReportData {
    year: number;
    ownerName: string;
    ownerEmail: string;
    revenue: number;
    expenses: number;
    net: number;
    properties: PropertyTaxSummary[];
}

export default function TaxSummaryPage() {
  const router = useRouter();
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaxReportData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        
        try {
            // ✅ APPEL SÉCURISÉ : Cookie Only (Plus de localStorage)
            const res = await api.get(`/owner/finance/tax?year=${year}`);
            
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error: any) {
            console.error("Erreur chargement fiscal", error);
            // Redirection si session expirée
            if (error.response?.status === 401) {
                router.push('/login');
            } else {
                toast.error("Impossible de générer le rapport fiscal.");
            }
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [year, router]);

  if (loading) return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 print:bg-white print:p-0 font-sans">
      
      {/* HEADER NO-PRINT */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center no-print">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour Finances
        </Button>
        <div className="flex gap-4">
            <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px] bg-white border-slate-300 shadow-sm">
                    <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
            </Select>
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg transition-all">
                <Printer className="w-4 h-4" /> Imprimer / PDF
            </Button>
        </div>
      </div>

      {/* FEUILLE A4 */}
      <div className="max-w-4xl mx-auto bg-white p-12 shadow-xl border border-slate-200 print:shadow-none print:border-0 print:w-full min-h-[29.7cm]">
        
        {/* EN-TÊTE DOCUMENT */}
        <div className="flex justify-between items-start mb-12 border-b border-slate-200 pb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Récapitulatif Fiscal Annuel</h1>
                <p className="text-slate-500">Année fiscale : <span className="font-bold text-slate-900 text-lg">{year}</span></p>
                <p className="text-slate-500 text-xs mt-1">Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-xl uppercase tracking-wider">{data?.ownerName || "Propriétaire"}</p>
                <p className="text-slate-500 text-sm">{data?.ownerEmail}</p>
                <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Bailleur Immobilier</p>
            </div>
        </div>

        {/* CARTES RÉSUMÉ */}
        <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 print:border-slate-300">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-2 tracking-wider">Total Revenus (Imposable)</p>
                <p className="text-2xl font-black text-emerald-900">{data?.revenue?.toLocaleString()} F</p>
            </div>
            <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 print:border-slate-300">
                <p className="text-xs font-bold text-rose-700 uppercase mb-2 tracking-wider">Dépenses Déductibles</p>
                <p className="text-2xl font-black text-rose-900">{data?.expenses?.toLocaleString()} F</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 print:border-slate-300">
                <p className="text-xs font-bold text-blue-700 uppercase mb-2 tracking-wider">Résultat Net</p>
                <p className="text-2xl font-black text-blue-900">{data?.net?.toLocaleString()} F</p>
            </div>
        </div>

        {/* TABLEAU DÉTAIL */}
        <div className="mb-4 flex items-center gap-4">
             <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Détail par Propriété</h3>
             <div className="flex-1 h-px bg-slate-200"></div>
        </div>
        
        <table className="w-full text-left border-collapse mb-12">
            <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] uppercase text-slate-500 tracking-wider">
                    <th className="py-3 pr-4">Bien Immobilier</th>
                    <th className="py-3 px-4 text-right">Loyers Perçus</th>
                    <th className="py-3 px-4 text-right">Travaux / Charges</th>
                    <th className="py-3 pl-4 text-right font-bold text-slate-900">Solde Net</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {!data?.properties || data.properties.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                            <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-6 h-6" />
                                Aucune activité fiscale enregistrée pour cette année.
                            </div>
                        </td>
                    </tr>
                ) : (
                    data.properties.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="py-4 pr-4">
                                <p className="font-bold text-slate-900">{item.title}</p>
                                <p className="text-slate-500 text-xs">{item.commune}</p>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-emerald-700 bg-emerald-50/30">
                                +{item.rev.toLocaleString()}
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-rose-700 bg-rose-50/30">
                                -{item.exp.toLocaleString()}
                            </td>
                            <td className="py-4 pl-4 text-right font-bold text-slate-900">
                                {item.net.toLocaleString()}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>

        {/* FOOTER DOCUMENT */}
        <div className="mt-auto pt-8 border-t border-slate-200 text-center text-[10px] text-slate-400 uppercase tracking-wider">
            <p>Document généré automatiquement par la plateforme ImmoFacile CI.</p>
            <p>Ce rapport est fourni à titre indicatif pour votre déclaration fiscale. Vérifiez les montants avec vos relevés bancaires.</p>
        </div>

      </div>
    </div>
  );
}
