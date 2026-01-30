import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. GET : Récupérer mes notifications
export async function GET(req: Request) {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20 // Les 20 dernières
    });

    // Compter les non-lues
    const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });
}

// 2. PUT : Marquer comme lu
export async function PUT(req: Request) {
    const userId = req.headers.get("x-user-id");
    
    // ✅ CORRECTIF DE SÉCURITÉ (TypeScript est content maintenant)
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await req.json(); // ID de la notif, ou "ALL"

    if (id === "ALL") {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    } else {
        // Sécurité supplémentaire : on s'assure que la notif appartient bien à l'user
        await prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true }
        });
    }

    return NextResponse.json({ success: true });
}
