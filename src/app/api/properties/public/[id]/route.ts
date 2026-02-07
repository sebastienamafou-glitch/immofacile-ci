import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Correction Next.js 15
) {
  try {
    const { id } = await params; // ✅ On attend la résolution

    // 1. Récupération optimisée du bien public
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
        // Confidentialité : On ne montre que le prénom/nom, pas l'email
        owner: {
            select: { 
                name: true,
                phone: true, // Utile pour le contact commercial
                // email: false // On cache l'email pour éviter le spam
            } 
        },
        leases: {
            where: { isActive: true },
            select: { id: true }
        }
      }
    });

    if (!property) {
      return NextResponse.json({ error: "Bien introuvable ou retiré." }, { status: 404 });
    }

    // 2. Calcul de disponibilité
    const isAvailable = property.leases.length === 0;

    // 3. Réponse nettoyée
    return NextResponse.json({
      success: true,
      property: {
        ...property,
        isAvailable,
        leases: undefined // On retire l'info technique des baux
      }
    });

  } catch (error) {
    console.error("Erreur Public Property:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
