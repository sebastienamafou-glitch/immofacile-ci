import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (ZERO TRUST) ---
async function checkSuperAdminPermission(request: Request) {
  // 1. Identification par ID (Session sécurisée)
  const userId = request.headers.get("x-user-id");
  
  if (!userId) {
    return { authorized: false, status: 401, error: "Non authentifié" };
  }

  // 2. Vérification Rôle
  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!admin || admin.role !== "SUPER_ADMIN") {
    return { authorized: false, status: 403, error: "Accès refusé : Rôle Super Admin requis" };
  }

  return { authorized: true, admin };
}

// =====================================================================
// GET : LISTER LES DOSSIERS KYC
// =====================================================================
export async function GET(request: Request) {
  try {
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const users = await prisma.user.findMany({
      where: { 
        OR: [
            { kycStatus: "PENDING" },
            { kycStatus: "VERIFIED" },
            { kycStatus: "REJECTED" }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        kycStatus: true, 
        kycDocuments: true,
        createdAt: true
      }
    });

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("[API_KYC_GET] Error:", error);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}

// =====================================================================
// PUT : VALIDER OU REJETER UN DOSSIER
// =====================================================================
export async function PUT(request: Request) {
    try {
        const auth = await checkSuperAdminPermission(request);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        const body = await request.json();
        const { userId, status } = body;

        if (!userId || !["VERIFIED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Données invalides" }, { status: 400 });
        }

        // Mise à jour + Validation du compte
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                kycStatus: status,
                isVerified: status === 'VERIFIED', // Le badge suit le statut
                updatedAt: new Date()
            },
            select: { id: true, kycStatus: true, email: true }
        });

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("[API_KYC_PUT] Error:", error);
        return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
    }
}
