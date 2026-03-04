import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NewPropertyForm from "./NewPropertyForm";
import BackButton from "@/components/shared/BackButton";
import { Building } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function NewPropertyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        {/* 2. L'appel propre au-dessus du titre */}
        <BackButton />
        
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight mt-2">
          <Building className="text-orange-500 w-8 h-8" />
          Publier une annonce
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Remplissez les détails pour mettre votre bien en ligne instantanément.</p>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <NewPropertyForm />
      </div>
    </div>
  );
}
