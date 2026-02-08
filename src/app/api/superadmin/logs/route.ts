import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Assurez-vous que ce chemin correspond à votre config NextAuth
import { prisma } from "@/lib/prisma";

// Force le rendu dynamique pour avoir toujours les derniers logs
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : VÉRIFICATION SUPER ADMIN
    const session = await auth();
    
    // On vérifie si l'utilisateur est connecté et s'il a le bon rôle
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json(
            { error: "Accès refusé. Réservé aux Super Admins." }, 
            { status: 403 }
        );
    }

    // 2. RÉCUPÉRATION DES LOGS D'AUDIT
    // ✅ CORRECTION : On cible 'auditLog' au lieu de 'transaction'
    const logs = await prisma.auditLog.findMany({
      take: 100, // On récupère les 100 derniers événements
      orderBy: { createdAt: 'desc' }, // Du plus récent au plus ancien
      include: { 
        user: { 
            // On inclut les infos utiles de l'utilisateur lié à l'action
            select: { 
                name: true, 
                email: true, 
                role: true 
            } 
        } 
      }
    });

    // 3. RÉPONSE FORMATÉE
    // Prisma renvoie déjà le format attendu par votre frontend (AuditLog[])
    return NextResponse.json({ success: true, logs });

  } catch (error: any) {
    console.error("Erreur lors de la lecture des logs:", error);
    return NextResponse.json(
        { error: "Erreur serveur lors de la récupération du registre." }, 
        { status: 500 }
    );
  }
}
