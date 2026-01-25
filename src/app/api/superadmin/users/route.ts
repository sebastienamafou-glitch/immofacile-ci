import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// MIDDLEWARE DE SÉCURITÉ INTERNE
async function checkSuperAdmin(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  if (!userEmail) return null;
  
  const admin = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!admin || admin.role !== "SUPER_ADMIN") return null;
  
  return admin;
}

// 1. GET : LISTER TOUS LES UTILISATEURS
export async function GET(request: Request) {
  try {
    if (!await checkSuperAdmin(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true, 
        role: true, 
        kycStatus: true,
        walletBalance: true,
        isActive: true, // ✅ INDISPENSABLE pour le bouton Bloquer
        backerTier: true,
        createdAt: true,
        _count: {
            select: { leases: true, propertiesOwned: true }
        }
      }
    });

    return NextResponse.json({ success: true, users });

  } catch (error) {
    console.error("API GET Users Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. PATCH : BLOQUER / DÉBLOQUER (Toggle Status)
export async function PATCH(request: Request) {
    try {
      const admin = await checkSuperAdmin(request);
      if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  
      const body = await request.json();
      const { userId, isActive } = body; // On attend un booléen
  
      // Sécurité : Un Admin ne peut pas se bloquer lui-même
      if (userId === admin.id) {
          return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte." }, { status: 400 });
      }
  
      const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: isActive } // true ou false
      });
  
      return NextResponse.json({ success: true, user: updatedUser });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur modification statut" }, { status: 500 });
    }
}

// 3. PUT : MODIFIER UN RÔLE
export async function PUT(request: Request) {
  try {
    const admin = await checkSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await request.json();
    const { userId, newRole } = body;

    // Sécurité : Un Admin ne peut pas se rétrograder lui-même via cette route (risque de lock-out)
    if (userId === admin.id && newRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Impossible de modifier son propre rôle ici." }, { status: 400 });
    }

    const validRoles = ["TENANT", "OWNER", "AGENT", "ARTISAN", "SUPER_ADMIN", "INVESTOR"]; // Ajout INVESTOR
    if (!userId || !validRoles.includes(newRole)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole }
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    return NextResponse.json({ error: "Erreur mise à jour rôle" }, { status: 500 });
  }
}

// 4. DELETE : SUPPRIMER UN UTILISATEUR
export async function DELETE(request: Request) {
    try {
      const admin = await checkSuperAdmin(request);
      if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("id");

      if (!userId) return NextResponse.json({ error: "ID requis" }, { status: 400 });

      // 🛑 SÉCURITÉ CRITIQUE : ANTI-SUICIDE
      if (userId === admin.id) {
        return NextResponse.json({ error: "ACTION INTERDITE : Vous ne pouvez pas supprimer votre propre compte administrateur." }, { status: 409 });
      }

      const userToDelete = await prisma.user.findUnique({
          where: { id: userId },
          include: { _count: { select: { leases: true, propertiesOwned: true } } }
      });

      if (!userToDelete) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

      if (userToDelete._count.leases > 0 || userToDelete._count.propertiesOwned > 0) {
          return NextResponse.json({ 
              error: "Impossible de supprimer : cet utilisateur a des dossiers actifs (Baux/Propriétés)." 
          }, { status: 409 });
      }
  
      await prisma.user.delete({ where: { id: userId } });
  
      return NextResponse.json({ success: true, message: "Utilisateur supprimé" });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
    }
}
