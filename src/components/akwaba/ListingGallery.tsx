import Image from "next/image";

export default function ListingGallery({ images, title }: { images: string[], title: string }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[500px] rounded-2xl overflow-hidden mb-8 relative">
        {/* Grande image principale */}
        <div className="md:col-span-2 md:row-span-2 relative h-full w-full bg-slate-200">
            <Image src={images[0]} alt={title} fill className="object-cover hover:scale-105 transition-transform duration-700" priority />
        </div>
        
        {/* Images secondaires (max 4 autres) */}
        <div className="hidden md:grid grid-cols-2 col-span-2 row-span-2 gap-2 h-full">
            {images.slice(1, 5).map((img, idx) => (
                <div key={idx} className="relative w-full h-full bg-slate-200">
                    <Image src={img} alt={`${title} ${idx}`} fill className="object-cover hover:scale-105 transition-transform duration-700" />
                </div>
            ))}
        </div>
        
        {/* Bouton "Voir toutes les photos" (Décoratif pour l'instant) */}
        <div className="absolute bottom-4 right-4">
            <button className="bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-white transition">
                Voir les photos
            </button>
        </div>
    </div>
  );
}
