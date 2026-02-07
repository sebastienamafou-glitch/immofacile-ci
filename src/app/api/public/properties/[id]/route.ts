import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        // 1. Relation Owner (Valide)
        owner: { 
            select: { 
                name: true, 
                // ✅ On récupère le statut KYC via la relation
                kyc: {
                    select: { status: true }
                }
            }
        }
        // ❌ SUPPRIMÉ : 'images' est inclus par défaut (champ simple)
        // ❌ SUPPRIMÉ : 'reviews' n'existe pas sur le modèle Property (Gestion)
      }
    });

    if (!property || !property.isPublished) {
      return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });
    }

    // REMAPPING
    const formattedProperty = {
        ...property,
        // On s'assure que images est un tableau (sécurité)
        images: property.images || [],
        reviews: [], // Tableau vide par défaut puisque pas de reviews
        owner: {
            name: property.owner.name,
            kycStatus: property.owner.kyc?.status || "PENDING"
        }
    };

    return NextResponse.json(formattedProperty);

  } catch (error) {
    console.error("Public Property Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
