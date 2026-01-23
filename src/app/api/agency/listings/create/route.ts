import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    
    // Validation
    if (!body.title || !body.pricePerNight || !body.city || !body.hostId) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Création avec les nouveaux champs
    const listing = await prisma.listing.create({
      data: {
        title: body.title,
        description: body.description || "",
        pricePerNight: parseInt(body.pricePerNight),
        
        // Localisation
        city: body.city,
        neighborhood: body.neighborhood,
        address: body.address,
        
        // ✅ NOUVEAUX CHAMPS (Capacité)
        bedrooms: parseInt(body.bedrooms) || 1,
        bathrooms: parseInt(body.bathrooms) || 1,
        maxGuests: parseInt(body.maxGuests) || 2,
        
        // Médias & Features
        images: body.images, 
        amenities: body.amenities || {}, 
        
        isPublished: true,
        agencyId: admin.agencyId,
        hostId: body.hostId
      }
    });

    return NextResponse.json({ success: true, listing });

  } catch (error: any) {
    console.error("Create Listing Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
