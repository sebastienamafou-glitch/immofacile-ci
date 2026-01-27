import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1. GET - Récupérer une annonce spécifique
export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION SÉCURISÉE
    const listing = await prisma.listing.findUnique({
      where: {
        id: params.listingId,
        hostId: userId // 🔒 Verrouillage par ID
      },
      include: {
        _count: {
            select: { bookings: true }
        }
      }
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });
    }

    return NextResponse.json(listing);

  } catch (error) {
    console.error("Erreur GET Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. PUT - Mettre à jour l'annonce
export async function PUT(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Vérification Existence + Propriété
    const existingListing = await prisma.listing.findUnique({
      where: { id: params.listingId, hostId: userId }
    });

    if (!existingListing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    const body = await request.json();

    // Mise à jour
    const updatedListing = await prisma.listing.update({
      where: { id: params.listingId },
      data: {
        title: body.title,
        description: body.description,
        pricePerNight: body.pricePerNight ? Number(body.pricePerNight) : undefined,
        
        address: body.address,
        city: body.city,
        neighborhood: body.neighborhood,
        
        images: body.images, 
        amenities: body.amenities, 
        
        isPublished: body.isPublished !== undefined ? body.isPublished : undefined
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error) {
    console.error("Erreur UPDATE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 3. DELETE - Supprimer
export async function DELETE(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 1. Vérif Owner
    const listing = await prisma.listing.findUnique({
      where: { id: params.listingId, hostId: userId }
    });

    if (!listing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    // 2. SÉCURITÉ : Vérifier réservations futures
    const activeBookingsCount = await prisma.booking.count({
      where: {
        listingId: params.listingId,
        status: { in: ['CONFIRMED', 'PAID'] },
        endDate: { gte: new Date() }
      }
    });

    if (activeBookingsCount > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer : ${activeBookingsCount} réservation(s) active(s).` 
      }, { status: 400 });
    }

    // 3. Suppression en cascade manuelle (Cleaner)
    await prisma.$transaction([
        prisma.booking.deleteMany({ where: { listingId: params.listingId } }),
        prisma.review.deleteMany({ where: { listingId: params.listingId } }),
        prisma.listing.delete({ where: { id: params.listingId } })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur DELETE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
