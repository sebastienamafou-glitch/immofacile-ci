import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DU MESSAGE
    const body = await req.json();
    const { title, message, targetRole, type } = body; 
    // targetRole peut être 'ALL', 'OWNER', 'TENANT', 'ARTISAN', 'INVESTOR'

    if (!title || !message) {
        return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }

    // 3. CIBLAGE DES TROUPES
    // On cible uniquement les utilisateurs actifs pour éviter le spam inutile
    const whereClause: any = { isActive: true };
    if (targetRole && targetRole !== 'ALL') {
        whereClause.role = targetRole;
    }
    
    // On récupère juste les ID pour optimiser
    const targets = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
    });

    if (targets.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "Aucune cible éligible trouvée." });
    }

    // 4. TIR DE BARRAGE (Création de masse)
    // Prisma createMany est très performant pour ça
    const notificationsData = targets.map(user => ({
        userId: user.id,
        title: title,
        message: message,
        type: type || 'INFO', // INFO, WARNING, SUCCESS, SYSTEM
        isRead: false,
        link: '/dashboard', // Lien par défaut vers le tableau de bord
        createdAt: new Date()
    }));

    await prisma.notification.createMany({
        data: notificationsData
    });

    return NextResponse.json({ 
        success: true, 
        count: targets.length,
        message: `Message envoyé à ${targets.length} utilisateurs.`
    });

  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la diffusion." }, { status: 500 });
  }
}
