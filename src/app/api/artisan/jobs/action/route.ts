import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const artisan = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true } 
    });

    if (!artisan || artisan.role !== "ARTISAN") {
        return NextResponse.json({ error: "Accès réservé aux artisans." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DATA
    const body = await request.json();
    const { jobId, action, photosBefore, photosAfter } = body; 

    if (!jobId || !action) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    const job = await prisma.incident.findUnique({
        where: { id: jobId },
        select: { id: true, assignedToId: true, status: true }
    });

    if (!job) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (job.assignedToId !== userId) return NextResponse.json({ error: "Accès interdit ce chantier" }, { status: 403 });

    // 3. LOGIQUE MÉTIER & VALIDATION PREUVES
    let updateData: any = {};

    switch (action) {
        case 'ACCEPT':
            if (job.status !== 'OPEN' && job.status !== 'IN_PROGRESS') {
                 return NextResponse.json({ error: "Statut incompatible." }, { status: 400 });
            }
            updateData = { status: 'IN_PROGRESS' };
            break;

        case 'REJECT':
            updateData = { assignedToId: null, status: 'OPEN' };
            break;

        case 'COMPLETE':
            // ✅ VERROUILLAGE : Impossible de finir sans preuves
            if (!photosBefore || photosBefore.length === 0 || !photosAfter || photosAfter.length === 0) {
                return NextResponse.json({ 
                    error: "PREUVES OBLIGATOIRES : Vous devez fournir des photos Avant et Après pour clôturer." 
                }, { status: 400 });
            }
            
            updateData = { 
                status: 'RESOLVED',
                photosBefore: photosBefore, // Enregistrement des URLs
                photosAfter: photosAfter
            };
            break;

        default:
            return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    // 4. EXÉCUTION
    await prisma.incident.update({
        where: { id: jobId },
        data: updateData
    });

    return NextResponse.json({ success: true, message: `Action ${action} enregistrée.` });

  } catch (error: any) {
    console.error("Erreur Job Action:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
