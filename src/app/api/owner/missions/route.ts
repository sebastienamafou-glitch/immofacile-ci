import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Auth Headers
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification du rôle PROPRIÉTAIRE
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. PARSING & VALIDATION
    const body = await request.json();
    const { propertyId, type, dateScheduled, fee } = body;

    if (!propertyId || !fee || !dateScheduled || !type) {
        return NextResponse.json({ error: "Données incomplètes (Bien, Type, Date, Honoraire)" }, { status: 400 });
    }

    const feeAmount = parseInt(fee);
    if (isNaN(feeAmount) || feeAmount <= 0) {
        return NextResponse.json({ error: "Montant des honoraires invalide" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (ANTI-IDOR)
    // On s'assure que le bien appartient bien à celui qui commande la mission
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            ownerId: owner.id // 🔒 Verrou de sécurité
        }
    });

    if (!property) {
        return NextResponse.json({ error: "Bien introuvable ou ne vous appartient pas." }, { status: 403 });
    }

    // 4. CRÉATION DE LA MISSION (Mode Marketplace)
    // Elle est créée en "PENDING" sans agent assigné.
    // Elle apparaîtra dans le dashboard des agents disponibles.
    const mission = await prisma.mission.create({
        data: {
            type: type, // VISITE, ETAT_LIEUX_ENTREE, etc.
            status: "PENDING",
            fee: feeAmount,
            dateScheduled: new Date(dateScheduled),
            property: { connect: { id: property.id } },
            // agentId reste null pour l'instant
        }
    });

    return NextResponse.json({ success: true, mission });

  } catch (error) {
    console.error("Erreur Création Mission:", error);
    return NextResponse.json({ error: "Impossible de créer la mission" }, { status: 500 });
  }
}
