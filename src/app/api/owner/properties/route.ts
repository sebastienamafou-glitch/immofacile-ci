import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from 'cloudinary';
import { Prisma } from "@prisma/client";

// Type strict aligné avec le Schema
type PropertyWithLeases = Prisma.PropertyGetPayload<{
  include: {
    leases: true 
  }
}>;

export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const properties = await prisma.property.findMany({
        where: { ownerId: owner.id },
        orderBy: { createdAt: 'desc' },
        include: {
            leases: { where: { isActive: true } }
        }
    });

    const formatted = (properties as PropertyWithLeases[]).map((p) => ({
        ...p,
        isAvailable: p.leases.length === 0 
    }));

    return NextResponse.json({ success: true, properties: formatted });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // ... (Garder votre code POST existant avec Cloudinary, il était correct) ...
  // Je ne le remets pas en entier pour ne pas surcharger, mais gardez la version "Best Practice" précédente.
  // Si vous l'avez perdu, dites-le moi, je le recollerai.
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    // ... suite du code POST ...
    return NextResponse.json({ success: true }); // Placeholder
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
