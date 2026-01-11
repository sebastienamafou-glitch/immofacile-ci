import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center p-4 text-center">
      <div className="text-6xl mb-6 animate-bounce">🤔</div>
      <h1 className="text-4xl font-black text-[#F59E0B] mb-2">404</h1>
      <h2 className="text-2xl font-bold text-white mb-6">Page Introuvable</h2>
      <p className="text-slate-400 mb-8 max-w-md">
        Il semble que vous ayez pris une mauvaise direction dans les couloirs de l'immeuble. Cette page a peut-être été déménagée.
      </p>
      <Link href="/">
        <Button className="bg-[#F59E0B] text-black hover:bg-orange-500 font-bold h-12 px-8 rounded-xl">
            Retour à l'accueil
        </Button>
      </Link>
    </div>
  );
}
