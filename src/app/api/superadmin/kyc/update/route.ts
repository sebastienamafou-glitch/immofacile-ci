import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION & RÔLE (Zero Trust)
    const session = await auth();
    
    if (!session || !session.user?.id || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé : Réservé au Super Admin" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES DONNÉES
    const body = await req.json();
    const { userId, status, reason } = body;

    // Validation basique
    if (!userId || !['VERIFIED', 'REJECTED'].includes(status)) {
         return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Tout ou rien)
    // On doit mettre à jour DEUX tables en même temps pour rester cohérent
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Mise à jour du dossier KYC (Détails)
        // Note : On utilise 'upsert' au cas où, mais normalement l'entrée existe déjà
        const updatedKyc = await tx.userKYC.update({
            where: { userId: userId }, // On vise via l'ID utilisateur
            data: {
                status: status,
                rejectionReason: status === 'REJECTED' ? reason : null, // On enregistre le motif si rejet
                reviewedAt: new Date()
            }
        });

        // B. Mise à jour du Flag Global User (Pour le Gatekeeper)
        // Si VERIFIED => isVerified = true
        // Si REJECTED => isVerified = false
        await tx.user.update({
            where: { id: userId },
            data: { 
                isVerified: status === 'VERIFIED' 
            }
        });

        return updatedKyc;
    });

    return NextResponse.json({ success: true, kyc: result });

  } catch (error: any) {
    console.error("🔥 Erreur Update KYC:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour" }, { status: 500 });
  }
}
