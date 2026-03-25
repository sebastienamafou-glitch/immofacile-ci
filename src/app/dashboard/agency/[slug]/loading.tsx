import { Skeleton } from "@/components/ui/skeleton";

export default function AgencyPublicLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- HERO SECTION SKELETON --- */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            
            {/* Logo Skeleton */}
            <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shrink-0 bg-slate-800" />

            {/* Infos Agence Skeleton */}
            <div className="text-center md:text-left flex-1 w-full flex flex-col items-center md:items-start space-y-4">
              <Skeleton className="h-10 w-3/4 md:w-1/2 bg-slate-800" />
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 w-full">
                <Skeleton className="h-5 w-32 bg-slate-800" />
                <Skeleton className="h-5 w-32 bg-slate-800" />
                <Skeleton className="h-5 w-48 bg-slate-800" />
              </div>
            </div>

            {/* CTA Skeleton */}
            <div>
              <Skeleton className="h-12 w-48 rounded-md bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENU SKELETON (ONGLETS + GRILLE) --- */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 min-h-[500px]">
          
          {/* Header des onglets */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-100 pb-4 gap-4">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <Skeleton className="h-10 w-36 rounded-lg bg-slate-200" />
              <Skeleton className="h-10 w-40 rounded-lg bg-slate-200" />
            </div>
            <Skeleton className="h-5 w-32 bg-slate-200" />
          </div>

          {/* Grille de cartes fantômes (8 éléments par défaut) */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={index} 
                className="bg-white border border-slate-200 rounded-xl overflow-hidden h-[380px] flex flex-col"
              >
                {/* Image Card Skeleton */}
                <Skeleton className="h-48 w-full rounded-none bg-slate-200" />
                
                {/* Body Card Skeleton */}
                <div className="p-4 flex flex-col flex-1 space-y-3">
                  <Skeleton className="h-4 w-1/3 bg-slate-200" />
                  <Skeleton className="h-6 w-3/4 bg-slate-200" />
                  
                  <div className="flex gap-4 mt-4">
                     <Skeleton className="h-4 w-12 bg-slate-200" />
                     <Skeleton className="h-4 w-12 bg-slate-200" />
                     <Skeleton className="h-4 w-12 bg-slate-200" />
                  </div>
                  
                  <Skeleton className="h-10 w-full mt-auto bg-slate-200" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
