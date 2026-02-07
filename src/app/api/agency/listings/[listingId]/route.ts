import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

// Helper de sécurité Zero Trust (Basé sur ID)
async function checkAgencyAccess(req: Request, listingId: string) {
  const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
  if (!userId) return null;

  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, agencyId: true }
  });

  if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return null;
  }

  // Vérification stricte : Le listing doit appartenir à l'agence de l'admin
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
      agencyId: admin.agencyId // 🔒 Verrou Agence
    }
  });

  if (!listing) return null;

  return { admin, listing };
}

// ==========================================
// 1. PATCH : Modifier l'annonce
// ==========================================
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
        
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
        images: body.images,
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error) {
    console.error("Update Listing Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. DELETE : Supprimer l'annonce
// ==========================================
export async function DELETE(req: Request, { params }: { params: { listingId: string } }) {
  try {
    const access = await checkAgencyAccess(req, params.listingId);
    if (!access) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Sécurité : Empêcher la suppression si des réservations futures existent
    // (Optionnel mais recommandé)
    const activeBookings = await prisma.booking.count({
        where: {
            listingId: params.listingId,
            status: { in: ['CONFIRMED', 'PAID'] },
            endDate: { gte: new Date() }
        }
    });

    if (activeBookings > 0) {
        return NextResponse.json({ 
            error: "Impossible de supprimer : Des réservations sont en cours ou à venir." 
        }, { status: 409 });
    }
    
    await prisma.listing.delete({
      where: { id: params.listingId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Listing Error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la suppression" }, { status: 500 });
  }
}
