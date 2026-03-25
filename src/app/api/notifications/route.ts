import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. GET : Récupérer les notifications avec sélection de champs (Optimisation Sentry)
export async function GET(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        // 🔥 OPTIMISATION : On ne récupère que les champs nécessaires pour alléger le payload
        // Cela réduit la charge mémoire et le temps de transfert réseau.
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                select: {
                    id: true,
                    title: true,
                    isRead: true,
                    createdAt: true,
                    type: true,
                    link: true,
                    // message est volontairement omis ici s'il est trop lourd pour une liste
                },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.notification.count({
                where: { userId, isRead: false }
            })
        ]);

        return NextResponse.json(
            { notifications, unreadCount },
            { 
                headers: { 
                    // Cache de 10 secondes pour éviter les appels trop fréquents lors de navigations rapides
                    'Cache-Control': 'private, max-age=10, stale-while-revalidate=5' 
                } 
            }
        );
    } catch (error) {
        console.error("Erreur notifications:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// 2. PUT : Marquer comme lu (Optimisation des requêtes)
export async function PUT(req: Request) {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
        const { id } = await req.json(); 

        if (id === "ALL") {
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
        } else {
            // Sécurité : On s'assure que la notification appartient bien à l'utilisateur
            await prisma.notification.updateMany({
                where: { 
                    id, 
                    userId 
                },
                data: { isRead: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Erreur update" }, { status: 500 });
    }
}
