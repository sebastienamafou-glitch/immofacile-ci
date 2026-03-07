import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        // 🛡️ On récupère les 5 dernières annonces "Système" ou "Globales"
        const news = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                type: { in: ["SYSTEM", "GLOBAL", "INFO"] } 
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                message: true,
                type: true,
                createdAt: true
            }
        });

        return NextResponse.json({ success: true, news });
    } catch (error) {
        console.error("Erreur API News:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
