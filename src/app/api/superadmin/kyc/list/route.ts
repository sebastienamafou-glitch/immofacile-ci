import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. SÉCURITÉ : AUTHENTIFICATION & RÔLE
    const session = await auth();
    
    // On vérifie que l'user est connecté ET qu'il est SUPER_ADMIN
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
                documents: true, // Array de strings (URLs Cloudinary)
                rejectionReason: true,
                updatedAt: true
            }
        }
      },
      orderBy: {
        kyc: {
            updatedAt: 'desc' // Les modifications récentes en haut
        }
      }
    });

    return NextResponse.json({ success: true, users });

  } catch (error: any) {
    console.error("🔥 Erreur API KYC List:", error);
    return NextResponse.json({ error: "Erreur serveur lors du chargement des dossiers" }, { status: 500 });
  }
}
