"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <Button 
        onClick={() => window.print()}
        variant="outline" 
        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-12 rounded-xl"
    >
        <Printer className="w-4 h-4 mr-2 text-orange-500" /> 
        <span>Imprimer</span>
    </Button>
  );
}
