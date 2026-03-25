import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : VÉRIFICATION SUPER ADMIN
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux Super Admins." },
        { status: 403 }
      );
    }

    // 2. PARAMÈTRES DE FILTRAGE (serveur)
    const { searchParams } = new URL(request.url);

    const action    = searchParams.get("action") as AuditAction | null;
    const dateStart = searchParams.get("dateStart");
    const dateEnd   = searchParams.get("dateEnd");
    const search    = searchParams.get("search");
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit     = Math.min(200, parseInt(searchParams.get("limit") ?? "100", 10));

    // 3. CONSTRUCTION DU FILTRE PRISMA (typage strict, zéro any)
    const where: Prisma.AuditLogWhereInput = {};

    if (action && Object.values(AuditAction).includes(action)) {
      where.action = action;
    }

    if (dateStart || dateEnd) {
      where.createdAt = {
        ...(dateStart ? { gte: new Date(dateStart) } : {}),
        ...(dateEnd
          ? { lte: new Date(new Date(dateEnd).setHours(23, 59, 59, 999)) }
          : {}),
      };
    }

    // Recherche textuelle : email stocké en clair dans userEmail ou via la relation user
    if (search) {
      where.OR = [
        { userEmail: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId:   { contains: search, mode: "insensitive" } },
        { ipAddress:  { contains: search, mode: "insensitive" } },
        { user: { name:  { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 4. RÉCUPÉRATION PAGINÉE
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" },
        select: {
          // Tous les champs du modèle AuditLog
          id:         true,
          action:     true,
          entityId:   true,
          entityType: true,
          userEmail:  true,
          metadata:   true,
          ipAddress:  true,
          userAgent:  true,
          createdAt:  true,
          // Relation user (données minimales, sans données sensibles)
          user: {
            select: {
              name:  true,
              email: true,
              role:  true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // 5. STATISTIQUES AGRÉGÉES PAR ACTION (pour le dashboard)
    const stats = await prisma.auditLog.groupBy({
      by: ["action"],
      _count: { action: true },
    });

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.map((s) => ({ action: s.action, count: s._count.action })),
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur lors de la lecture des logs:", message);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération du registre." },
      { status: 500 }
    );
  }
}
