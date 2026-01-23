import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// On force le mode dynamique car on utilise des params d'URL
export const dynamic = "force-dynamic";

// 1. GET - Récupérer une annonce spécifique pour l'édition
export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    // Sécurité Auth
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // On vérifie que l'annonce appartient bien à cet utilisateur
    const listing = await prisma.listing.findUnique({
      where: {
        id: params.listingId,
        host: { email: userEmail } // Sécurité : doit appartenir au Host
      },
      include: {
        _count: {
            select: { bookings: true } // Info utile pour le front
        }
      }
    });

    if (!listing) {
      return NextResponse.json({ error: "Annonce introuvable ou accès refusé" }, { status: 404 });
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
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Vérif Owner
    const existingListing = await prisma.listing.findUnique({
      where: { id: params.listingId, host: { email: userEmail } }
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
        pricePerNight: body.pricePerNight ? parseInt(body.pricePerNight) : undefined,
        
        address: body.address,
        city: body.city,
        neighborhood: body.neighborhood,
        
        images: body.images, // Array de strings
        amenities: body.amenities, // JSON
        
        // On peut aussi gérer la publication ici
        isPublished: body.isPublished !== undefined ? body.isPublished : undefined
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error) {
    console.error("Erreur UPDATE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 3. DELETE - Supprimer (avec sécurité Réservations)
export async function DELETE(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 1. Vérifier si l'annonce existe et appartient au user
    const listing = await prisma.listing.findUnique({
      where: { id: params.listingId, host: { email: userEmail } }
    });

    if (!listing) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    // 2. SÉCURITÉ CRITIQUE : Vérifier les réservations futures actives
    // On ne peut pas supprimer une annonce si un client a payé pour venir demain !
    const activeBookingsCount = await prisma.booking.count({
      where: {
        listingId: params.listingId,
        status: { in: ['CONFIRMED', 'PAID'] }, // Statuts valides
        endDate: { gte: new Date() } // Se termine dans le futur
      }
    });

    if (activeBookingsCount > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer : ${activeBookingsCount} réservation(s) active(s) ou future(s).` 
      }, { status: 400 });
    }

    // 3. Suppression (On supprime d'abord les bookings passés/annulés via cascade si configuré, sinon prisma le gère souvent mal sans cascade explicite dans le schema. 
    // Ici, par prudence, on supprime l'annonce. Si Prisma bloque à cause des clés étrangères, il faudra supprimer les bookings archivés avant.)
    
    // NOTE: Si votre schema n'a pas "onDelete: Cascade" sur la relation Booking->Listing, 
    // cette ligne plantera s'il y a des vieux bookings.
    // Solution sûre : supprimer d'abord les bookings liés (puisqu'on a vérifié qu'il n'y en a pas d'actifs).
    await prisma.booking.deleteMany({
        where: { listingId: params.listingId }
    });
    
    // Idem pour les avis s'il y en a
    await prisma.review.deleteMany({
        where: { listingId: params.listingId }
    });

    await prisma.listing.delete({
      where: { id: params.listingId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur DELETE Listing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
