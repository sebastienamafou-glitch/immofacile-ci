import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client"; // ✅ 1. Import de l'Enum

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. DÉFINITION DES TYPES
// =====================================================================

const getKycUsersQuery = () => prisma.user.findMany({
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
  }
});

type KycUser = Awaited<ReturnType<typeof getKycUsersQuery>>[number];

// =====================================================================
// 2. FONCTION PRINCIPALE (GET)
// =====================================================================
export async function GET(request: Request) {
  try {
    // SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ 2. CORRECTION : Utilisation de Role.SUPER_ADMIN
    if (!admin || admin.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Interdit" }, { status: 403 });
    }

    // REQUÊTE
    const usersRaw = await getKycUsersQuery();

    // MAPPING
    const users = usersRaw.map((u: KycUser) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        kycStatus: u.kycStatus,
        documents: u.kycDocuments || [] 
    }));

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("Erreur Admin KYC:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// 3. FONCTION ACTION (PUT) - Validation
// =====================================================================
export async function PUT(request: Request) {
    try {
        const userEmail = request.headers.get("x-user-email");
        const body = await request.json();
        const { userId, status } = body; 

        if (!userEmail || !userId || !status) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

        const admin = await prisma.user.findUnique({ where: { email: userEmail } });
        
        // ✅ 3. CORRECTION ICI AUSSI
        if (!admin || admin.role !== Role.SUPER_ADMIN) {
            return NextResponse.json({ error: "Interdit" }, { status: 403 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { 
                kycStatus: status,
                isVerified: status === 'VERIFIED',
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Erreur mise à jour KYC" }, { status: 500 });
    }
}
