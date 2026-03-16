import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 🔒 Sécurité : Verrouillage par Token (à configurer dans ton hébergeur, ex: Vercel Cron)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Calcul de la date limite (30 jours en arrière)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Purge chirurgicale
        const result = await prisma.processedWebhook.deleteMany({
            where: {
                processedAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });

        console.log(`[CRON] Garbage Collection: ${result.count} webhooks purgés.`);
        
        return NextResponse.json({ 
            success: true, 
            purgedCount: result.count 
        });

    } catch (error) {
        console.error("[CRON Error] Purge Webhooks:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
