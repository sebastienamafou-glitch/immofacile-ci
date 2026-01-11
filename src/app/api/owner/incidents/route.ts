import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    // 2. DONNÉES
    const body = await request.json();
    const { title, description, propertyId } = body;

    // 3. CRÉATION INCIDENT
    // Par défaut, l'incident est créé avec le status 'OPEN'
    const newIncident = await prisma.incident.create({
        data: {
            title,
            description: description || "Pas de description",
            status: "OPEN",
            priority: "NORMAL",
            photos: [], // On laisse vide pour l'instant si pas d'upload S3
            reporter: { connect: { id: owner.id } }, // C'est le proprio qui reporte
            property: { connect: { id: propertyId } }
        }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("Erreur Incident:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
