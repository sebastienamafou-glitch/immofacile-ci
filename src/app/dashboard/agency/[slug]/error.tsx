'use client'; // Obligatoire pour les Error Boundaries dans Next.js

import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AgencyErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AgencyPublicError({ error, reset }: AgencyErrorProps) {
  // En production, l'erreur est capturée ici. Pas de console.log pour respecter nos règles de Clean Code.
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
        
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
          Oups, un problème est survenu
        </h2>
        
        <p className="text-slate-500 mb-8 text-sm">
          Nous n&apos;avons pas pu charger les données de cette agence. Il s&apos;agit probablement d&apos;une erreur temporaire de connexion au serveur.
        </p>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => reset()} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tenter à nouveau
          </Button>
          
          <Button asChild variant="outline" className="w-full border-slate-200 text-slate-600 h-12">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Retour au tableau de bord
            </Link>
          </Button>
        </div>
        
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400 font-mono">
            Réf: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
