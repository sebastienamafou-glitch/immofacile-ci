import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// 👇 IMPORT DE SÉCURITÉ (Indispensable)
import { decrypt } from "@/lib/crypto";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION & RÔLE
    const session = await auth();
    
    // On vérifie que l'user est connecté ET qu'il est SUPER_ADMIN
    // (Pour l'audit : on pourrait aussi vérifier en DB, mais la session est OK ici)
    if (!session || !session.user?.id || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé : Réservé au Super Admin" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DES DOSSIERS
    // On ne prend que les users qui ont une entrée dans la table UserKYC
    const users = await prisma.user.findMany({
      where: {
        kyc: {
            isNot: null // Filtre : Seulement ceux qui ont soumis un dossier
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        kyc: {
            select: {
                status: true,
                documents: true, // Array de strings (URLs Cloudinary/Blob)
                rejectionReason: true,
                updatedAt: true,
                idType: true,    // ✅ AJOUT : Type de pièce (CNI, Passeport)
                idNumber: true   // ✅ AJOUT : Le numéro chiffré
            }
        }
      },
      orderBy: {
        kyc: {
            updatedAt: 'desc' // Les modifications récentes en haut
        }
      }
    });

    // 3. DÉCHIFFREMENT (TRANSFORMATION DES DONNÉES)
    // On ne peut pas envoyer "iv:a9f8..." au frontend, on doit le rendre lisible
    const formattedUsers = users.map(user => {
        // Si le numéro existe, on le déchiffre. Sinon, on met un placeholder.
        const encryptedNumber = user.kyc?.idNumber;
        const readableIdNumber = encryptedNumber ? decrypt(encryptedNumber) : "Non renseigné";

        return {
            ...user,
            kyc: user.kyc ? {
                ...user.kyc,
                idNumber: readableIdNumber // ✅ Le numéro est maintenant lisible pour l'admin
            } : null
        };
    });

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error: any) {
    console.error("🔥 Erreur API KYC List:", error);
    return NextResponse.json({ error: "Erreur serveur lors du chargement des dossiers" }, { status: 500 });
  }
}
