import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
// 👇 IMPORT POUR GÉNÉRER LES LIENS S3 TEMPORAIRES
import { getPresignedViewUrl } from "@/lib/s3";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.id || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé : Réservé au Super Admin" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        kyc: { isNot: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        kyc: {
            select: {
                status: true,
                documents: true, // Ceci contient la clé S3 chiffrée (ex: private/users/...)
                rejectionReason: true,
                updatedAt: true,
                idType: true,
                idNumber: true
            }
        }
      },
      orderBy: { kyc: { updatedAt: 'desc' } }
    });

    // 3. TRANSFORMATION (Déchiffrement + URL S3)
    // On utilise Promise.all car getPresignedViewUrl est asynchrone
    const formattedUsers = await Promise.all(users.map(async (user) => {
        
        let readableIdNumber = "Non renseigné";
        if (user.kyc?.idNumber) {
            try { readableIdNumber = decrypt(user.kyc.idNumber); } catch (e) {}
        }

        // 🔥 TRANSFORMATION DE LA CLÉ S3 EN URL VISIBLE 🔥
        let documentUrls: string[] = [];
        if (user.kyc?.documents && user.kyc.documents.length > 0) {
            // On prend la dernière clé envoyée
            const fileKey = user.kyc.documents[user.kyc.documents.length - 1];
            try {
                // Si c'est déjà une URL (ex: Cloudinary ancien format), on la garde
                if (fileKey.startsWith('http')) {
                    documentUrls = [fileKey];
                } else {
                    // Sinon, on génère l'URL signée S3 (valide quelques minutes)
                    const signedUrl = await getPresignedViewUrl(fileKey);
                    documentUrls = [signedUrl];
                }
            } catch (error) {
                console.error("Erreur génération URL S3 pour:", fileKey);
            }
        }

        return {
            ...user,
            kyc: user.kyc ? {
                ...user.kyc,
                idNumber: readableIdNumber,
                documents: documentUrls // On remplace la clé par l'URL signée !
            } : null
        };
    }));

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error: unknown) {
    if (error instanceof Error) {
        console.error("🔥 Erreur API KYC List:", error.message);
    } else {
        console.error("🔥 Erreur API KYC List inconnue");
    }
    return NextResponse.json({ error: "Erreur serveur lors du chargement des dossiers" }, { status: 500 });
  }
}
