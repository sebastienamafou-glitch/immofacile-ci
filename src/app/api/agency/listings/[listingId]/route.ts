import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper de sécurité
async function checkAgencyAccess(req: Request, listingId: string) {
  const userEmail = req.headers.get("x-user-email");
  if (!userEmail) return null;

  const admin = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { agency: true }
  });

  if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) return null;

  // On vérifie que le listing est bien à EUX
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
      agencyId: admin.agencyId // 🔒 Check propriété
    }
  });

  if (!listing) return null;

  return { admin, listing };
}

export async function PATCH(req: Request, { params }: { params: { listingId: string } }) {
  try {
    const access = await checkAgencyAccess(req, params.listingId);
    if (!access) return NextResponse.json({ error: "Accès refusé ou bien introuvable" }, { status: 403 });

    const body = await req.json();

    const updatedListing = await prisma.listing.update({
      where: { id: params.listingId },
      data: {
        title: body.title,
        description: body.description,
        pricePerNight: body.pricePerNight ? parseInt(body.pricePerNight) : undefined,
        city: body.city,
        neighborhood: body.neighborhood,
        address: body.address,
        
        // Champs Capacité
        bedrooms: body.bedrooms ? parseInt(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? parseInt(body.bathrooms) : undefined,
        maxGuests: body.maxGuests ? parseInt(body.maxGuests) : undefined,
        
        isPublished: body.isPublished,
        images: body.images,
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error) {
    console.error("Update Listing Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { listingId: string } }) {
  try {
    const access = await checkAgencyAccess(req, params.listingId);
    if (!access) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // TODO: Vérifier s'il y a des réservations futures avant de supprimer ?
    // Pour l'instant on supprime, Prisma bloquera s'il y a des contraintes FK strictes sur Bookings sans cascade.
    
    await prisma.listing.delete({
      where: { id: params.listingId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Listing Error:", error);
    return NextResponse.json({ error: "Impossible de supprimer (Réservations actives ?)" }, { status: 500 });
  }
}
