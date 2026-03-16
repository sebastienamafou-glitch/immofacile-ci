"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

// Adapte l'import du toast selon ta librairie (ex: sonner, react-hot-toast, ou shadcn/ui)
import { toast } from "sonner"; 

export function ExportFinanceButton() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        try {
            setIsExporting(true);

            const response = await fetch("/api/superadmin/finance/export", {
                method: "GET",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Échec de l'export. Vérifiez vos droits d'accès.");
            }

            // 1. Récupération du flux en Blob (Binaire)
            const blob = await response.blob();

            // 2. Création de l'URL éphémère du navigateur (Anti-fuite mémoire)
            const url = window.URL.createObjectURL(blob);

            // 3. Extraction dynamique du nom de fichier via le header Content-Disposition
            const disposition = response.headers.get("content-disposition");
            let filename = `export_grand_livre_${new Date().toISOString().split('T')[0]}.csv`;
            
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // 4. Déclenchement programmatique du clic
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // 5. Nettoyage chirurgical du DOM et de la RAM
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Grand livre exporté avec succès.");

        } catch (error) {
            console.error("[EXPORT_FINANCE_ERROR]", error);
            toast.error(error instanceof Error ? error.message : "Erreur réseau lors de l'export.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700 h-10 px-4 py-2"
        >
            {isExporting ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extraction en cours...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Exporter le Grand Livre (CSV)
                </>
            )}
        </button>
    );
}
