import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ==========================================
// 1. GET - RÉCUPÉRER UNE ANNONCE SPÉCIFIQUE
// ==========================================
export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const listing = await prisma.listing.findUnique({
      where: {
        id: params.listingId,
        hostId: userId 
      },
      include: {
        _count: { select: { bookings: true } }
      }
    });

    if (!listing) return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });

    return NextResponse.json(listing);

  } catch (error) {
    console.error("Erreur GET Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. PUT - METTRE À JOUR L'ANNONCE
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();

    // Vérification Existence + Propriété
    const existingListing = await prisma.listing.findUnique({
      where: { id: params.listingId, hostId: userId }
    });

    if (!existingListing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Validation du prix
    let cleanPrice = undefined;
    if (body.pricePerNight !== undefined) {
        cleanPrice = Number(body.pricePerNight);
        if (isNaN(cleanPrice) || cleanPrice < 0) return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }

    const updatedListing = await prisma.listing.update({
      where: { id: params.listingId },
      data: {
        title: body.title,
        description: body.description,
        pricePerNight: cleanPrice,
        address: body.address,
        city: body.city,
        neighborhood: body.neighborhood,
        images: body.images, 
        amenities: body.amenities, 
        isPublished: body.isPublished
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error) {
    console.error("Erreur UPDATE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 3. DELETE - SUPPRESSION SÉCURISÉE
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const listing = await prisma.listing.findUnique({
      where: { id: params.listingId, hostId: userId },
      include: { _count: { select: { bookings: true } } }
    });

    if (!listing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // SÉCURITÉ AUDIT : On ne supprime pas si un historique de réservation existe
    // On préfère désactiver l'annonce pour garder la trace financière
    if (listing._count.bookings > 0) {
        await prisma.listing.update({
            where: { id: params.listingId },
            data: { isPublished: false } // "Soft Delete"
        });
        return NextResponse.json({ 
            success: true, 
            message: "L'annonce a été retirée du marché car elle possède un historique de réservations." 
        });
    }

    // Si vraiment aucune réservation n'a jamais eu lieu, on supprime
    await prisma.listing.delete({ where: { id: params.listingId } });

    return NextResponse.json({ success: true, message: "Annonce supprimée définitivement." });

  } catch (error) {
    console.error("Erreur DELETE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
