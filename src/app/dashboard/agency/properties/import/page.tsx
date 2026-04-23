import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportPropertiesModal } from "@/features/properties/components/ImportPropertiesModal";

export default async function ImportPropertiesPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      
      {/* HEADER ÉPURÉ */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agency/properties">
          <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5 text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Importation Massive</h1>
          <p className="text-slate-400 text-sm mt-1">Automatisez la création de votre parc immobilier</p>
        </div>
      </div>

      {/* INJECTION DU MODAL */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ImportPropertiesModal />
      </div>

    </div>
  );
}
