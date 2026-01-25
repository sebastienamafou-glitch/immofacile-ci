import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ ---
async function checkSuperAdminPermission(request: Request) {
  // 1. On récupère l'email injecté par le Middleware (Preuve que le token est valide)
  const userEmail = request.headers.get("x-user-email");
  
  if (!userEmail) {
    return { authorized: false, status: 401, error: "Non authentifié" };
  }

  // 2. Double vérification en base de données (Le rôle a-t-il changé depuis la connexion ?)
  const admin = await prisma.user.findUnique({ 
    where: { email: userEmail },
    select: { role: true } // On ne select que ce qui est nécessaire (Perf)
  });

  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    return { authorized: false, status: 403, error: "Accès refusé : Rôle Super Admin requis" };
  }

  return { authorized: true, admin };
}

// =====================================================================
// GET : LISTER LES DOSSIERS KYC
// =====================================================================
export async function GET(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Requête Optimisée
    const users = await prisma.user.findMany({
      where: { 
        OR: [
            { kycStatus: "PENDING" },
            { kycStatus: "VERIFIED" },
            { kycStatus: "REJECTED" }
        ]
      },
      orderBy: { updatedAt: 'desc' }, // Les dossiers modifiés récemment en premier
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
        // 1. Sécurité
        const auth = await checkSuperAdminPermission(request);
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

        // 2. Validation des données entrantes
        const body = await request.json();
        const { userId, status } = body;

        // Validation stricte des inputs
        if (!userId || !["VERIFIED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Données invalides ou statut inconnu" }, { status: 400 });
        }

        // 3. Mise à jour Atomique
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                kycStatus: status,
                isVerified: status === 'VERIFIED', // Le flag boolean suit le statut KYC
                updatedAt: new Date() // Force le refresh du timestamp
            },
            select: { id: true, kycStatus: true, email: true }
        });

        // (Optionnel) Ici, on pourrait envoyer un email de notification à l'utilisateur
        console.log(`[KYC] Dossier ${updatedUser.email} mis à jour : ${status}`);

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error) {
        console.error("[API_KYC_PUT] Error:", error);
        return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
    }
}
