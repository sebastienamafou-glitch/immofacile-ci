import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true }
    });

    if (!user?.agencyId) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // Sécurité : On vérifie que l'agence possède bien cette annonce
    const existingListing = await prisma.listing.findUnique({
      where: { id: params.id, agencyId: user.agencyId }
    });

    if (!existingListing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

    const body = await request.json();

    // Mise à jour en base
    const updatedListing = await prisma.listing.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        pricePerNight: Number(body.pricePerNight),
        city: body.city,
        neighborhood: body.neighborhood,
        address: body.address,
        bedrooms: Number(body.bedrooms),
        bathrooms: Number(body.bathrooms),
        maxGuests: Number(body.maxGuests),
        images: body.images,
        isPublished: body.isPublished
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "PROPERTY_UPDATED",
        entityId: updatedListing.id,
        entityType: "LISTING",
        userId: session.user.id,
        metadata: { source: "API Agency Edit", updatedFields: "Multiple" }
      }
    });

    return NextResponse.json({ success: true, listing: updatedListing });

  } catch (error: unknown) {
    console.error("🚨 PATCH LISTING ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { agencyId: true }
    });

    if (!user?.agencyId) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    const existingListing = await prisma.listing.findUnique({
      where: { id: params.id, agencyId: user.agencyId }
    });

    if (!existingListing) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });

    // Suppression
    await prisma.listing.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        action: "PROPERTY_UPDATED", 
        entityId: params.id,
        entityType: "LISTING",
        userId: session.user.id,
        metadata: { source: "API Agency Delete", action: "DELETED" }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("🚨 DELETE LISTING ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la suppression." }, { status: 500 });
  }
}
