"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Printer, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentData {
  id: string;
  title: string;
  type: string;
  content: string;
  date: string;
  author: string;
}

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulation (À remplacer par un fetch réel si besoin)
    setTimeout(() => {
        setDoc({ 
            id: (params?.id as string) || "1", 
            title: "Règlement de Copropriété", 
            type: "PDF CERTIFIÉ", 
            date: "01/01/2024",
            author: "Syndic ImmoFacile",
            content: "Ceci est un aperçu générique du document..." 
        });
        setLoading(false);
    }, 500);
  }, [params]);

  const handlePrint = () => window.print();

  if (loading) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;

  if (!doc) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-400 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p>Document inaccessible.</p>
        <Button onClick={() => router.back()} variant="outline">Retour</Button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 flex flex-col h-screen overflow-hidden font-sans print:bg-white print:text-black print:h-auto print:overflow-visible">
      
      {/* HEADER TOP */}
      <div className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-[#0F172A] print:hidden shrink-0 z-50">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-white/5">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-sm font-black text-white uppercase tracking-wider">{doc.title}</h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{doc.type}</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Button onClick={handlePrint} variant="ghost" className="text-slate-400 hover:text-white hidden md:flex gap-2"><Printer className="w-4 h-4" /> Imprimer</Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2"><Download className="w-4 h-4" /> Télécharger</Button>
        </div>
      </div>

      {/* CONTENU DU DOCUMENT */}
      <div className="flex-1 bg-slate-900/50 p-4 md:p-10 overflow-y-auto flex justify-center print:bg-white print:p-0 print:block">
        <div className="w-full max-w-4xl bg-white min-h-[1000px] shadow-2xl rounded-sm p-12 text-slate-800 print:shadow-none">
            <div className="border-b-2 border-slate-900 pb-8 mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{doc.title}</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Document Officiel
                    </p>
                </div>
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
            </div>
            <div className="space-y-6 text-justify leading-relaxed font-serif text-slate-600">
                <p>{doc.content}</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
            </div>
        </div>
      </div>
    </main>
  );
}
