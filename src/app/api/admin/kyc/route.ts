import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. DÉFINITION DES TYPES (Inférence Native TypeScript - Infaillible)
// =====================================================================

// On définit la requête type pour que TypeScript comprenne la structure
const getKycUsersQuery = () => prisma.user.findMany({
  where: { 
    // On veut ceux qui sont en attente ou déjà traités
    OR: [
        { kycStatus: "PENDING" },
        { kycStatus: "VERIFIED" },
        { kycStatus: "REJECTED" }
    ]
    // On retire la condition isEmpty pour voir aussi les anciens formats
  },
  orderBy: { updatedAt: 'desc' },
  select: { 
    id: true, 
    name: true, 
    email: true, 
    role: true, 
    kycStatus: true, 
    kycDocuments: true, // Ancien
    kycDocumentUrl: true // Nouveau
  }
});

type KycUser = Awaited<ReturnType<typeof getKycUsersQuery>>[number];


// =====================================================================
// 2. FONCTION PRINCIPALE
// =====================================================================
export async function GET(request: Request) {
  try {
    // SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // REQUÊTE
    const usersRaw = await getKycUsersQuery();

    // Mapping pour le frontend (formatage des docs)
    const users = usersRaw.map((u: KycUser) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        kycStatus: u.kycStatus,
        // On normalise : Soit la nouvelle URL, soit la première de l'ancien tableau
        documentUrl: u.kycDocumentUrl || (u.kycDocuments.length > 0 ? u.kycDocuments[0] : null)
    }));

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("Erreur Admin KYC:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Action : Valider ou Rejeter un dossier
export async function PUT(request: Request) {
    try {
        const userEmail = request.headers.get("x-user-email");
        const body = await request.json();
        const { userId, status, reason } = body; // status = VERIFIED | REJECTED

        if (!userEmail || !userId || !status) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

        const admin = await prisma.user.findUnique({ where: { email: userEmail } });
        if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

        // Mise à jour
        await prisma.user.update({
            where: { id: userId },
            data: { 
                kycStatus: status,
                // Idéalement, on loguerait la raison du rejet quelque part, mais restons simple
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: "Erreur mise à jour KYC" }, { status: 500 });
    }
}
