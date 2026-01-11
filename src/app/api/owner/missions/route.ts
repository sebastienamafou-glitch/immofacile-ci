import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    const body = await request.json(); // { propertyId, type, dateScheduled, fee }

    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // Validation
    if (!body.propertyId || !body.fee) {
        return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // CRÉATION DE LA MISSION (Mode Uber : Statut PENDING, sans agent assigné)
    const mission = await prisma.mission.create({
        data: {
            type: body.type, // VISITE, ETAT_LIEUX...
            status: "PENDING",
            fee: parseInt(body.fee),
            dateScheduled: new Date(body.dateScheduled),
            property: { connect: { id: body.propertyId } },
            // Pas d'agentId ici, c'est le premier qui accepte qui prend la mission !
        }
    });

    return NextResponse.json({ success: true, mission });

  } catch (error) {
    console.error("Erreur Création Mission:", error);
    return NextResponse.json({ error: "Impossible de créer la mission" }, { status: 500 });
  }
}
