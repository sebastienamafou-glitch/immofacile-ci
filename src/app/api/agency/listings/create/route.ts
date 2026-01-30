import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION ADMIN AGENCE
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Accès refusé. Réservé aux agences." }, { status: 403 });
    }

    // 3. VALIDATION DONNÉES
    const body = await req.json();
    
    if (!body.title || !body.pricePerNight || !body.city || !body.hostId) {
        return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // 4. CRÉATION SÉCURISÉE
    const listing = await prisma.listing.create({
      data: {
        title: body.title,
        description: body.description || "",
        pricePerNight: parseInt(body.pricePerNight),
        
        // Localisation
        city: body.city,
        neighborhood: body.neighborhood,
        address: body.address,
        
        // Capacité
        bedrooms: parseInt(body.bedrooms) || 1,
        bathrooms: parseInt(body.bathrooms) || 1,
        maxGuests: parseInt(body.maxGuests) || 2,
        
        // Médias
        images: body.images || [], 
        amenities: body.amenities || {}, 
        
        isPublished: true,

        // 🟢 SÉCURITÉ CRITIQUE : VERROUILLAGE AGENCE
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
