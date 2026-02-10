'use client'

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <Button 
        onClick={() => window.print()} 
        className="bg-black text-white hover:bg-orange-600 shadow-xl font-bold gap-2 rounded-full px-6 py-6"
    >
        <Printer className="w-5 h-5" /> Imprimer / PDF
    </Button>
  );
}
