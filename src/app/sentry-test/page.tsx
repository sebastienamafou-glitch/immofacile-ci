"use client";

import { Button } from "@/components/ui/button";

export default function SentryTestPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-red-50">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Zone de Crash Test 💥</h1>
        <p>Cliquez sur ce bouton pour simuler une erreur fatale.</p>
        
        <Button 
            variant="destructive"
            onClick={() => {
                throw new Error("Ceci est un test Sentry depuis le Frontend !");
            }}
        >
            Faire planter l'app
        </Button>
      </div>
    </div>
  );
}
