import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ (Identity Check)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (admin?.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION DU MESSAGE
    const { title, message, targetRole, type } = await req.json(); 
    // targetRole peut être 'ALL', 'OWNER', 'TENANT', 'ARTISAN'

    if (!title || !message) {
        return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    // 3. CIBLAGE DES TROUPES
    const whereClause = targetRole === 'ALL' ? {} : { role: targetRole };
    
    const targets = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
    });

    if (targets.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "Aucune cible trouvée." });
    }

    // 4. TIR DE BARRAGE (Création de masse)
    // On prépare les données pour createMany
    const notificationsData = targets.map(user => ({
        userId: user.id,
        title: title,
        message: message,
        type: type || 'INFO', // INFO, WARNING, SUCCESS
        isRead: false,
        link: '/dashboard' // Redirection par défaut
    }));

    await prisma.notification.createMany({
        data: notificationsData
    });

    return NextResponse.json({ success: true, count: targets.length });

  } catch (error) {
    console.error("Broadcast Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
