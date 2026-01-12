import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!artisan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const { jobId, action } = await request.json(); // ACCEPT, REJECT, COMPLETE

    if (action === 'ACCEPT') {
        await prisma.incident.update({
            where: { id: jobId },
            data: { status: 'IN_PROGRESS' }
        });
    } else if (action === 'REJECT') {
        // On désassigne l'artisan pour que quelqu'un d'autre puisse le prendre (si logique Uber)
        // Ou on le marque juste rejeté par lui
        await prisma.incident.update({
            where: { id: jobId },
            data: { assignedToId: null, status: 'OPEN' } // Retourne dans le pool
        });
    } else if (action === 'COMPLETE') {
        // Transaction : On ferme l'incident et on paie (logique simplifiée)
        await prisma.$transaction([
            prisma.incident.update({
                where: { id: jobId },
                data: { status: 'RESOLVED' }
            }),
            // Optionnel : Créditer le wallet de l'artisan ici si le paiement est auto
        ]);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Job Action:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
