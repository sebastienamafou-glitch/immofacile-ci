import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Récupération des paramètres avec valeurs par défaut
    const title = searchParams.get('title')?.slice(0, 60) || 'Propriété vérifiée';
    const price = searchParams.get('price') || 'Prix sur demande';
    const location = searchParams.get('location') || 'Côte d\'Ivoire';
    const isGhost = searchParams.get('ghost') === 'true';

    return new ImageResponse(
      (
        <div tw="flex flex-col w-full h-full bg-[#020617] text-white font-sans border-[16px] border-[#F59E0B]">
          
          {/* Header : Branding & Badge de Confiance */}
          <div tw="flex justify-between items-center w-full p-12 pb-0">
            <div tw="flex items-center">
              <span tw="text-4xl font-black tracking-tighter">
                BAB<span tw="text-[#F59E0B]">IMMO</span>.CI
              </span>
            </div>
            <div tw="flex items-center bg-emerald-500/20 border border-emerald-500 rounded-full px-6 py-3">
              <span tw="text-2xl font-bold text-emerald-400 uppercase tracking-widest">
                ✓ Profil Vérifié
              </span>
            </div>
          </div>

          {/* Corps de l'image : La valeur perçue */}
          <div tw="flex flex-col justify-center px-12 py-10 flex-grow">
            <h1 tw="text-6xl font-black text-white leading-tight mb-4">
              {title}
            </h1>
            
            <div tw="flex items-center mt-4">
              <div tw="flex bg-white/10 rounded-2xl px-8 py-4 mr-6 border border-white/20">
                <span tw="text-4xl font-bold text-slate-300">{location}</span>
              </div>
              <div tw="flex bg-[#F59E0B]/20 rounded-2xl px-8 py-4 border border-[#F59E0B]/50">
                <span tw="text-4xl font-black text-[#F59E0B]">{price} FCFA</span>
              </div>
            </div>
          </div>

          {/* Footer / Call to action psychologique */}
          <div tw="flex w-full bg-white/5 p-8 px-12 border-t border-white/10 items-center justify-between">
            <span tw="text-2xl text-slate-400 font-medium">
              {isGhost ? "Contact direct avec le démarcheur / propriétaire" : "Réservation sécurisée via Babimmo"}
            </span>
            <span tw="text-2xl font-bold text-[#F59E0B]">
              Voir l'annonce ➔
            </span>
          </div>
          
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error("Erreur OG Image:", e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
