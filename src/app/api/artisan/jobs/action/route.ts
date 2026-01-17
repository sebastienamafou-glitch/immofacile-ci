import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({ where: { email: userEmail } });

    // ✅ CHECK RÔLE (Important)
    if (!artisan || artisan.role !== "ARTISAN") {
        return NextResponse.json({ error: "Accès réservé aux artisans." }, { status: 403 });
    }

    // 2. VALIDATION
    const body = await request.json();
    const { jobId, action } = body; // ACCEPT, REJECT, COMPLETE

    if (!jobId || !action) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    // 3. VÉRIFICATION DE PROPRIÉTÉ
    // On vérifie que cette mission est bien assignée à CET artisan
    const job = await prisma.incident.findUnique({
        where: { id: jobId }
    });

    if (!job) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    
    // Sécurité : Seul l'artisan assigné peut agir dessus
    if (job.assignedToId !== artisan.id) {
        return NextResponse.json({ error: "Cette mission ne vous est pas assignée." }, { status: 403 });
    }

    // 4. LOGIQUE MÉTIER
    if (action === 'ACCEPT') {
        // L'artisan confirme qu'il prend le job
        await prisma.incident.update({
            where: { id: jobId },
            data: { status: 'IN_PROGRESS' }
        });

    } else if (action === 'REJECT') {
        // L'artisan refuse le job, on le remet dans le pool (Open et sans assignation)
        await prisma.incident.update({
            where: { id: jobId },
            data: { 
                assignedToId: null, // On retire l'assignation
                status: 'OPEN'      // Retour case départ
            }
        });

    } else if (action === 'COMPLETE') {
        // L'artisan a fini
        await prisma.incident.update({
            where: { id: jobId },
            data: { status: 'RESOLVED' } // En attente de validation finale par Admin/Tenant si besoin
        });
    } else {
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Action ${action} effectuée.` });

  } catch (error: any) {
    console.error("Erreur Job Action:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
