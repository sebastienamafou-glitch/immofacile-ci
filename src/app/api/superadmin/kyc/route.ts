import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// 👇 INDISPENSABLE POUR L'AUDIT (Lecture des données sécurisées)
import { decrypt } from "@/lib/crypto";

export const dynamic = 'force-dynamic';

// --- HELPER SÉCURITÉ ---
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
// GET : LISTER LES DOSSIERS (AVEC DÉCHIFFREMENT)
// =====================================================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const users = await prisma.user.findMany({
      where: { 
        kyc: {
            // On récupère tous ceux qui ont un dossier (même REJECTED pour l'historique)
            status: { in: ["PENDING", "VERIFIED", "REJECTED"] }
        }
      },
      orderBy: { 
        kyc: { updatedAt: 'desc' } // Tri par date de mise à jour du dossier
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        createdAt: true,
        kyc: {
            select: {
                status: true,
                documents: true,
                rejectionReason: true,
                updatedAt: true,
                idType: true,  // ✅ On récupère le type
                idNumber: true // ✅ On récupère le numéro chiffré
            }
        }
      }
    });

    // Remapping sécurisé pour le frontend
    const formattedUsers = users.map(u => {
        // 🔐 DÉCHIFFREMENT À LA VOLÉE
        const encryptedNum = u.kyc?.idNumber;
        const readableNum = encryptedNum ? decrypt(encryptedNum) : "Non renseigné";

        return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            kyc: u.kyc ? {
                ...u.kyc,
                idNumber: readableNum // ✅ L'admin voit le vrai numéro
            } : null
        };
    });

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error) {
    console.error("[API_KYC_GET] Error:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// =====================================================================
// PUT : VALIDER OU REJETER (TRANSACTION ATOMIQUE)
// =====================================================================
export async function PUT(request: Request) {
    try {
        const admin = await checkSuperAdmin();
        if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

        const body = await request.json();
        const { userId, status, reason } = body; // On récupère aussi la raison du rejet

        if (!userId || !["VERIFIED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Données invalides" }, { status: 400 });
        }

        // 🛡️ TRANSACTION ATOMIQUE
        // Soit tout réussit, soit tout échoue. Pas de données bancales.
        await prisma.$transaction(async (tx) => {
            // 1. Mise à jour du dossier KYC
            await tx.userKYC.update({
                where: { userId: userId },
                data: { 
                    status: status,
                    rejectionReason: status === 'REJECTED' ? reason : null,
                    reviewedAt: new Date(),
                    reviewedBy: admin.id
                }
            });

            // 2. Mise à jour du statut global de l'utilisateur
            // Si validé -> isVerified = true. Sinon false.
            await tx.user.update({
                where: { id: userId },
                data: { 
                    isVerified: status === 'VERIFIED' 
                }
            });
        });

        return NextResponse.json({ 
            success: true, 
            userId: userId, 
            status: status 
        });

    } catch (error) {
        console.error("[API_KYC_PUT] Error:", error);
        return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
    }
}
