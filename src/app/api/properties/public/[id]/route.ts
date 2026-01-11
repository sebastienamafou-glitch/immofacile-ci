import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } } // Version Next.js 14 compatible
) {
  try {
    const { id } = params;

    const property = await prisma.property.findUnique({
      where: { 
        id: id,
        isPublished: true 
      },
      select: {
        id: true,
        title: true,
        description: true,
        address: true,
        commune: true,
        price: true,
        type: true,
        bedrooms: true,
        bathrooms: true,
        surface: true,
        images: true,
        createdAt: true,
        // ✅ ON AJOUTE LES INFOS DE CONTACT DU PROPRIÉTAIRE
        owner: {
            select: { 
                name: true,
                phone: true, // Indispensable pour l'affiche
                email: true
            } 
        },
        leases: {
            where: { isActive: true },
            select: { id: true }
        }
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Bien introuvable." }, { status: 404 });
    }

    const isAvailable = property.leases.length === 0;

    return NextResponse.json({
      success: true,
      property: {
        ...property,
        isAvailable,
        leases: undefined 
      }
    });

  } catch (error) {
    console.error("Erreur Public Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
