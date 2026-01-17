import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : Identité & Rôle
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification du rôle
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Action réservée aux propriétaires." }, { status: 403 });
    }

    // 2. DONNÉES
    const body = await request.json();
    const { title, description, propertyId, priority, photos } = body;

    if (!title || !propertyId) {
        return NextResponse.json({ error: "Titre et Propriété requis" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (CRUCIAL)
    // On s'assure que le bien appartient bien à ce propriétaire
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            ownerId: owner.id // 🔒 Verrouillage
        }
    });

    if (!property) {
        return NextResponse.json({ error: "Bien introuvable ou ne vous appartient pas." }, { status: 403 });
    }

    // 4. CRÉATION DE L'INCIDENT
    const newIncident = await prisma.incident.create({
        data: {
            title,
            description: description || "Pas de description",
            status: "OPEN",
            priority: priority || "NORMAL",
            photos: photos || [], // Support des photos si envoyées
            reporter: { connect: { id: owner.id } }, 
            property: { connect: { id: property.id } }
        }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("Erreur Création Incident (Owner):", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
