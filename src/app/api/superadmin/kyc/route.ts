import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getPresignedViewUrl } from "@/lib/s3"; // 🟢 INDISPENSABLE POUR S3
import { z } from "zod";

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
// GET : LISTER LES DOSSIERS (AVEC S3 & DÉCHIFFREMENT)
// =====================================================================
export async function GET() {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const users = await prisma.user.findMany({
      where: { 
        kyc: { status: { in: ["PENDING", "VERIFIED", "REJECTED"] } }
      },
      orderBy: { 
        kyc: { updatedAt: 'desc' }
      },
      select: { 
        id: true, name: true, email: true, role: true, createdAt: true,
        kyc: {
            select: {
                status: true, documents: true, rejectionReason: true,
                updatedAt: true, idType: true, idNumber: true
            }
        }
      }
    });

    // 🟢 RÉINTÉGRATION DE LA LOGIQUE S3
    const formattedUsers = await Promise.all(users.map(async (u) => {
        let readableNum = "Non renseigné";
        if (u.kyc?.idNumber) {
            try { readableNum = decrypt(u.kyc.idNumber); } catch (e) {}
        }

        let documentUrls: string[] = [];
        if (u.kyc?.documents && u.kyc.documents.length > 0) {
            const fileKey = u.kyc.documents[u.kyc.documents.length - 1];
            try {
                if (fileKey.startsWith('http')) {
                    documentUrls = [fileKey];
                } else {
                    const signedUrl = await getPresignedViewUrl(fileKey);
                    documentUrls = [signedUrl];
                }
            } catch (error) {
                console.error("Erreur génération URL S3 pour:", fileKey);
            }
        }

        return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            kyc: u.kyc ? {
                ...u.kyc,
                idNumber: readableNum,
                documents: documentUrls // 🟢 Injection de l'URL signée
            } : null
        };
    }));

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error) {
    console.error("[API_KYC_GET] Error:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// =====================================================================
// PUT : VALIDER OU REJETER (TRANSACTION + NOTIFICATION)
// =====================================================================
const KycDecisionSchema = z.object({
    userId: z.string().cuid(),
    status: z.enum(['VERIFIED', 'REJECTED']),
    reason: z.string().optional().nullable()
});

export async function PUT(request: Request) {
    try {
        const admin = await checkSuperAdmin();
        if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

        const body = await request.json();
        const parsed = KycDecisionSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
        }

        const { userId, status, reason } = parsed.data;

        await prisma.$transaction(async (tx) => {
            await tx.userKYC.update({
                where: { userId: userId },
                data: { 
                    status: status,
                    rejectionReason: status === 'REJECTED' ? reason : null,
                    reviewedAt: new Date(),
                    reviewedBy: admin.id
                }
            });

            await tx.user.update({
                where: { id: userId },
                data: { isVerified: status === 'VERIFIED' }
            });

            await tx.notification.create({
                data: {
                    userId: userId,
                    title: status === 'VERIFIED' ? "Identité validée ✅" : "Dossier refusé ❌",
                    message: status === 'VERIFIED' 
                        ? "Votre compte est maintenant vérifié." 
                        : `Pièce d'identité refusée. Motif : ${reason || "Non conforme."}`,
                    type: status === 'VERIFIED' ? "SUCCESS" : "ERROR",
                    link: "/dashboard"
                }
            });
        });

        return NextResponse.json({ success: true, userId, status });

    } catch (error) {
        console.error("[API_KYC_PUT] Error:", error);
        return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
    }
}
