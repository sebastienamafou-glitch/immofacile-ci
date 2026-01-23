import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/akwaba/CheckoutClient";

interface PageProps {
  params: { listingId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  // 1. SÉCURITÉ : Récupération de l'identité via le Middleware
  // Le middleware a déjà validé le token et injecté cet header
  const headersList = headers();
  const userEmail = headersList.get("x-user-email");

  // EN PROD STRICT : Pas de user = Pas de checkout
  if (!userEmail) {
    const callbackUrl = encodeURIComponent(`/checkout/${params.listingId}?${new URLSearchParams(searchParams as any).toString()}`);
    redirect(`/login?callbackUrl=${callbackUrl}`);
  }

  // 2. Validation des paramètres URL
  const { listingId } = params;
  const startDateStr = typeof searchParams.start === 'string' ? searchParams.start : undefined;
  const endDateStr = typeof searchParams.end === 'string' ? searchParams.end : undefined;
  const guestsStr = typeof searchParams.guests === 'string' ? searchParams.guests : "1";

  if (!startDateStr || !endDateStr) {
    redirect(`/akwaba/${listingId}`);
  }

  // 3. Chargement des données (Prisma)
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
        id: true,
        title: true,
        city: true,
        pricePerNight: true,
        images: true,
    }
  });

  if (!listing) return notFound();

  // 4. Calculs Serveur
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const guests = parseInt(guestsStr);
  
  const timeDiff = end.getTime() - start.getTime();
  const dayDiff = timeDiff / (1000 * 3600 * 24);
  const nights = Math.max(1, Math.ceil(dayDiff));
  const total = listing.pricePerNight * nights;

  // 5. Rendu
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
        <CheckoutClient 
            listing={listing}
            startDate={start}
            endDate={end}
            guests={guests}
            nights={nights}
            total={total}
            currentUserEmail={userEmail} // ✅ Passé pour l'UI uniquement
        />
    </div>
  );
}
