import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

// --- HELPER SÉCURITÉ (MIGRATION v5) ---
async function checkSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!admin || admin.role !== "SUPER_ADMIN") return null;
  return admin;
}

// =====================================================================
// GET : LISTER LES DOSSIERS KYC
// =====================================================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const users = await prisma.user.findMany({
      where: { 
        // ✅ FILTRE VIA RELATION (User -> UserKYC)
        kyc: {
            status: { in: ["PENDING", "VERIFIED", "REJECTED"] }
        }
      },
      orderBy: { updatedAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true,
        
        // ✅ SÉLECTION VIA RELATION
        kyc: {
            select: {
                status: true,
                documents: true
            }
        }
      }
    });

    // Remapping pour le frontend (Aplatissage)
    const formattedUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        kycStatus: u.kyc?.status || "PENDING",
        kycDocuments: u.kyc?.documents || []
    }));

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error) {
    console.error("[API_KYC_GET] Error:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// =====================================================================
// PUT : VALIDER OU REJETER UN DOSSIER
// =====================================================================
export async function PUT(request: Request) {
    try {
        const admin = await checkSuperAdmin();
        if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

        const body = await request.json();
        const { userId, status } = body;

        if (!userId || !["VERIFIED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Données invalides" }, { status: 400 });
        }

        // ✅ MISE À JOUR CIBLÉE (UserKYC)
        // On met à jour le statut dans la table dédiée
        const updatedKYC = await prisma.userKYC.update({
            where: { userId: userId },
            data: { 
                status: status
            }
        });

        // Optionnel : Si vous avez gardé un flag 'isVerified' sur User pour des perfs
        // await prisma.user.update({
        //    where: { id: userId },
        //    data: { isVerified: status === 'VERIFIED' }
        // });

        return NextResponse.json({ 
            success: true, 
            userId: userId, 
            newStatus: updatedKYC.status 
        });

    } catch (error) {
        console.error("[API_KYC_PUT] Error:", error);
        return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
    }
}
