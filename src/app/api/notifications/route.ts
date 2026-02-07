import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

// 1. GET : Récupérer mes notifications
export async function GET(req: Request) {
    // 🛡️ SÉCURITÉ : On récupère l'ID via le cookie de session (inviolable)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        // On renvoie un tableau vide pour ne pas faire crasher le front, 
        // ou 401 si on veut être strict (mais géré par le front)
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Erreur notifications:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// 2. PUT : Marquer comme lu
export async function PUT(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    try {
        const { id } = await req.json(); 

        if (id === "ALL") {
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
        } else {
            await prisma.notification.updateMany({
                where: { id, userId },
                data: { isRead: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erreur update" }, { status: 500 });
    }
}
