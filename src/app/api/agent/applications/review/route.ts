import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. AUTH ZERO TRUST
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { id: userId }, select: { role: true }});
    if (!agent || agent.role !== 'AGENT') return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // 2. INPUT
    const body = await req.json();
    const { leaseId, decision } = body; // 'APPROVED' | 'REJECTED'

    if (!leaseId || !['APPROVED', 'REJECTED'].includes(decision)) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 3. LOGIQUE MÉTIER
    if (decision === 'REJECTED') {
        // On annule le bail (statut CANCELLED ou REJECTED selon votre enum)
        // Votre enum LeaseStatus a : PENDING, ACTIVE, TERMINATED, CANCELLED
        await prisma.lease.update({
            where: { id: leaseId },
            data: { status: 'CANCELLED' } // Ou REJECTED si ajouté à l'enum
        });
        return NextResponse.json({ success: true, message: "Dossier rejeté." });
    }

    if (decision === 'APPROVED') {
        // On active le bail !
        // Attention : Normalement il faut aussi vérifier le paiement de la caution avant d'activer.
        // Ici on suppose que l'agent valide manuellement que tout est OK.
        await prisma.lease.update({
            where: { id: leaseId },
            data: { 
                status: 'ACTIVE',
                isActive: true
            }
        });
        
        // Optionnel : Envoyer email de bienvenue au locataire
        return NextResponse.json({ success: true, message: "Dossier approuvé. Bail actif !" });
    }

  } catch (error) {
    console.error("Review Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
