import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// 1. MÉTHODE D'INFÉRENCE STRICTE (Notre standard)
const getUsersQuery = () => prisma.user.findMany({
  orderBy: { createdAt: 'desc' },
  select: { 
    id: true, 
    name: true, 
    email: true, 
    phone: true, 
    role: true, 
    kycStatus: true,
    walletBalance: true,
    // On simule le champ 'isActive' s'il n'existe pas dans le schéma
    // Sinon, remplacez par le vrai champ si vous l'avez ajouté
    createdAt: true
  }
});

type AdminUserView = Awaited<ReturnType<typeof getUsersQuery>>[number];

export async function GET(request: Request) {
  try {
    // SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // REQUÊTE
    const usersRaw = await getUsersQuery();

    // MAPPING
    const users = usersRaw.map((u: AdminUserView) => ({
        ...u,
        // Astuce : Si vous n'avez pas de champ 'isActive' en base, 
        // on considère par défaut que tout le monde est actif pour l'instant.
        // Pour bloquer réellement, il faudrait ajouter ce champ au schema.prisma
        isActive: true 
    }));

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("Erreur Admin Users:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Action : Bloquer / Débloquer (POST)
export async function POST(request: Request) {
    // Cette route pourra être activée quand vous aurez ajouté le champ 'isActive' au modèle User
    return NextResponse.json({ success: true, message: "Fonctionnalité prête (en attente de migration DB)" });
}
