"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Download, FileText, Printer, 
  Loader2, AlertTriangle, ShieldCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ✅ Typage strict des données du document
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
  const [error, setError] = useState(false);

  useEffect(() => {
    // Simulation d'un appel API sécurisé
    const fetchDocument = async () => {
      setLoading(true);
      try {
        // Simulation de délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockDocs: DocumentData[] = [
          { 
            id: "1", 
            title: "Règlement de copropriété", 
            type: "PDF", 
            date: "01/01/2024",
            author: "Syndic Gestion",
            content: "Le présent règlement a pour objet de définir les droits et obligations des copropriétaires..." 
          },
          { 
            id: "2", 
            title: "Guide du locataire", 
            type: "PDF", 
            date: "15/01/2024",
            author: "ImmoFacile",
            content: "Bienvenue dans votre logement. Ce guide vous accompagne dans vos démarches quotidiennes..." 
          },
        ];
        
        // Sécurisation : on s'assure que params.id est une string
        const docId = Array.isArray(params.id) ? params.id[0] : params.id;
        const found = mockDocs.find(d => d.id === docId);

        if (found) {
            setDoc(found);
        } else {
            // Fallback pour les IDs inconnus (Simulation archive)
            setDoc({ 
                id: docId || "unknown", 
                title: "Document Archivé", 
                type: "ARCHIVE", 
                date: new Date().toLocaleDateString(),
                author: "Système",
                content: "Ce document est une archive ancienne. Son aperçu simplifié est généré automatiquement." 
            });
        }
      } catch (err) {
        console.error(err);
        setError(true);
        toast.error("Erreur lors du chargement du document.");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchDocument();
  }, [params.id]);

  // ✅ Fonction d'impression native
  const handlePrint = () => {
    window.print();
  };

  // ✅ Simulation de téléchargement sécurisé
  const handleDownload = () => {
    toast.success("Téléchargement lancé", {
        description: `Le fichier ${doc?.title}.pdf a été envoyé vers votre dossier Téléchargements.`
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
        <p className="text-xs font-bold uppercase tracking-widest">Chargement du document...</p>
    </div>
  );

  if (error || !doc) return (
    <div className="min-h-screen bg-[#060B18] flex flex-col items-center justify-center text-slate-400 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p>Document introuvable ou inaccessible.</p>
        <Button onClick={() => router.back()} variant="outline">Retour</Button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 flex flex-col h-screen overflow-hidden font-sans print:bg-white print:text-black print:h-auto print:overflow-visible">
      
      {/* HEADER (Caché à l'impression) */}
      <div className="h-20 border-b border-white/10 flex items-center justify-between px-6 bg-[#0F172A] print:hidden shrink-0 z-50">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()} 
                className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/5"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-sm font-black text-white uppercase tracking-wider truncate max-w-[200px] md:max-w-md">{doc.title}</h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                    <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{doc.type}</span>
                    <span>REF: {doc.id}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <Button 
                onClick={handlePrint}
                variant="ghost" 
                className="text-slate-400 hover:text-white hidden md:flex gap-2 text-xs uppercase tracking-widest hover:bg-white/5"
            >
                <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Button 
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20"
            >
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Télécharger</span>
            </Button>
        </div>
      </div>

      {/* ZONE DE CONTENU (PDF PREVIEW) */}
      <div className="flex-1 bg-slate-900/50 p-4 md:p-10 overflow-y-auto flex justify-center print:bg-white print:p-0 print:block">
        <div className="w-full max-w-4xl bg-white min-h-[1000px] shadow-2xl rounded-sm p-12 text-slate-800 print:shadow-none print:w-full print:max-w-none">
            
            {/* En-tête du Document */}
            <div className="border-b-2 border-slate-900 pb-8 mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">{doc.title}</h2>
                    <div className="flex flex-col gap-1">
                        <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Document Officiel ImmoFacile
                        </p>
                        <p className="text-slate-400 text-[10px]">Édité le {doc.date} par {doc.author}</p>
                    </div>
                </div>
                {/* Logo simulé ou icône */}
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 print:border-black">
                    <FileText className="w-8 h-8 text-slate-400" />
                </div>
            </div>

            {/* Corps du texte */}
            <div className="space-y-6 text-justify leading-relaxed font-serif text-slate-600 print:text-black">
                <p><strong>Article 1 : Préambule</strong></p>
                <p>
                    {doc.content} Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                    Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                
                <p><strong>Article 2 : Dispositions Générales</strong></p>
                <p>
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                    Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>

                {/* Bloc de certification visuelle */}
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl my-8 flex items-center gap-4 print:border-black print:bg-white">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 print:border print:border-black">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Certification Numérique</p>
                        <p className="text-xs text-slate-500 italic">Ce document est authentifié par la blockchain ImmoFacile. Hash: 8f9a...2b1c</p>
                    </div>
                </div>

                <p><strong>Article 3 : Obligations</strong></p>
                <p>
                    Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, 
                    totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>
            </div>

            {/* Pied de page du document */}
            <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono print:text-black print:border-black">
                <span>ID Unique: {doc.id}-{Date.now().toString().slice(-6)}</span>
                <span>Page 1/1</span>
            </div>

        </div>
      </div>

    </main>
  );
}
