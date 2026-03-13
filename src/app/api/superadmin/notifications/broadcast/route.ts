import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Role, Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

// 1. VALIDATION STRICTE (Zod)
const broadcastSchema = z.object({
  target: z.string(), 
  title: z.string().min(3, "Titre trop court"),
  message: z.string().min(5, "Message trop court"),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"]).default("INFO"),
  link: z.string().optional()
});

export async function POST(req: Request) {
  try {
    // 2. SÉCURITÉ BLINDÉE (Auth v5)
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

    // 3. VALIDATION DU PAYLOAD
    const body = await req.json();
    const validation = broadcastSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { target, title, message, type, link } = validation.data;

    // 4. CIBLAGE STRICT (Typage Prisma natif, fin des 'any')
    let rolesToTarget: Role[] = [];
    
    switch (target) {
        case "TENANT":
        case "TENANTS":
            rolesToTarget = [Role.TENANT];
            break;
        case "OWNER":
        case "OWNERS":
            rolesToTarget = [Role.OWNER, Role.AGENCY_ADMIN]; // Inclusion stricte des agences
            break;
        case "ARTISAN":
            rolesToTarget = [Role.ARTISAN];
            break;
        case "INVESTOR":
        case "INVESTORS":
            rolesToTarget = [Role.INVESTOR, Role.AMBASSADOR];
            break;
        case "ALL":
        default:
            break;
    }

    // Construction typée de la clause Where
    const whereClause: Prisma.UserWhereInput = { isActive: true };
    
    if (target !== "ALL" && rolesToTarget.length > 0) {
        whereClause.role = { in: rolesToTarget };
    }

    const targets = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
    });

    if (targets.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: "Aucune cible éligible trouvée." });
    }

    // 5. TIR DE BARRAGE (Bulk Insert Atomique)
    const notificationsData = targets.map(user => ({
        userId: user.id,
        title: title,
        message: message,
        type: type,
        isRead: false,
        link: link || '/dashboard', 
    }));

    const result = await prisma.notification.createMany({
        data: notificationsData,
        skipDuplicates: true
    });

    return NextResponse.json({ 
        success: true, 
        count: result.count,
        message: `Message envoyé à ${result.count} utilisateurs.`
    });

  } catch (error) {
    console.error("[BROADCAST_ERROR]", error);
    return NextResponse.json({ error: "Erreur serveur lors de la diffusion." }, { status: 500 });
  }
}
