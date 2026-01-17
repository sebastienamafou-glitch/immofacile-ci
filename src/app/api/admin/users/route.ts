import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. GET : LISTER TOUS LES UTILISATEURS
// =====================================================================

// Méthode d'inférence stricte
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
    createdAt: true,
    // On compte les éléments liés pour savoir si on peut supprimer
    _count: {
        select: {
            leases: true,
            propertiesOwned: true
        }
    }
  }
});

type AdminUserView = Awaited<ReturnType<typeof getUsersQuery>>[number];

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification Rôle
    if (!admin || admin.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. REQUÊTE
    const usersRaw = await getUsersQuery();

    // 3. MAPPING
    const users = usersRaw.map((u: AdminUserView) => ({
        ...u,
        // Un utilisateur est "supprimable" s'il n'a pas de baux ni de propriétés
        canDelete: u._count.leases === 0 && u._count.propertiesOwned === 0
    }));

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("Erreur Admin Users GET:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// 2. PUT : MODIFIER UN RÔLE (Promouvoir / Rétrograder)
// =====================================================================
export async function PUT(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // 2. VALIDATION
    const body = await request.json();
    const { userId, newRole } = body;

    const validRoles = ["TENANT", "OWNER", "AGENT", "ARTISAN", "ADMIN"];
    if (!userId || !validRoles.includes(newRole)) {
        return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // 3. MISE À JOUR
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Erreur Admin Update Role:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// 3. DELETE : SUPPRIMER UN UTILISATEUR (Nettoyage)
// =====================================================================
export async function DELETE(request: Request) {
    try {
      // 1. SÉCURITÉ
      const userEmail = request.headers.get("x-user-email");
      if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
      const admin = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });
  
      // 2. VALIDATION
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("id");

      if (!userId) return NextResponse.json({ error: "ID requis" }, { status: 400 });

      // On vérifie d'abord si l'utilisateur peut être supprimé
      const userToDelete = await prisma.user.findUnique({
          where: { id: userId },
          include: { _count: { select: { leases: true, propertiesOwned: true } } }
      });

      if (!userToDelete) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

      // Protection : On ne supprime pas un utilisateur qui a des données critiques
      if (userToDelete._count.leases > 0 || userToDelete._count.propertiesOwned > 0) {
          return NextResponse.json({ 
              error: "Impossible de supprimer cet utilisateur car il possède des baux ou des propriétés actifs." 
          }, { status: 409 });
      }
  
      // 3. SUPPRESSION
      await prisma.user.delete({ where: { id: userId } });
  
      return NextResponse.json({ success: true, message: "Utilisateur supprimé" });
  
    } catch (error) {
      console.error("Erreur Admin Delete User:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }
