import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

// --- HELPER SÉCURITÉ (MIGRATION v5) ---
async function checkSuperAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  
  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!admin || admin.role !== "SUPER_ADMIN") return null;
  return admin;
}

// ==========================================
// 1. GET : LISTER TOUS LES UTILISATEURS
// ==========================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true, 
        role: true, 
        isActive: true, 
        backerTier: true,
        createdAt: true,
        
        // ✅ CORRECTION SCHEMA : Relations
        kyc: {
            select: { status: true }
        },
        finance: {
            select: { walletBalance: true }
        },

        // On compte les liens pour éviter les suppressions dangereuses
        _count: {
            select: { leases: true, propertiesOwned: true, listings: true }
        }
      }
    });

    // Remapping pour le frontend (Aplatissage)
    const formattedUsers = users.map(u => ({
        ...u,
        kycStatus: u.kyc?.status || "PENDING",
        walletBalance: u.finance?.walletBalance || 0,
        kyc: undefined, // Nettoyage
        finance: undefined // Nettoyage
    }));

    return NextResponse.json({ success: true, users: formattedUsers });

  } catch (error) {
    console.error("API GET Users Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. PATCH : BLOQUER / DÉBLOQUER
// ==========================================
export async function PATCH(request: Request) {
    try {
      const admin = await checkSuperAdmin();
      if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  
      const body = await request.json();
      const { userId, isActive } = body; 
  
      // SÉCURITÉ : Anti-Suicide (On ne peut pas se bloquer soi-même)
      if (userId === admin.id) {
          return NextResponse.json({ error: "Action impossible sur votre propre compte." }, { status: 400 });
      }
  
      const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: isActive }
      });
  
      return NextResponse.json({ success: true, user: updatedUser });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur modification statut" }, { status: 500 });
    }
}

// ==========================================
// 3. PUT : MODIFIER RÔLE
// ==========================================
export async function PUT(request: Request) {
  try {
    const admin = await checkSuperAdmin();
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await request.json();
    const { userId, newRole } = body;

    // SÉCURITÉ : On ne touche pas à son propre rôle de Super Admin
    if (userId === admin.id) {
        return NextResponse.json({ error: "Modification de votre propre rôle interdite ici." }, { status: 400 });
    }

    const validRoles = ["TENANT", "OWNER", "AGENT", "ARTISAN", "SUPER_ADMIN", "INVESTOR", "AGENCY_ADMIN"];
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

// ==========================================
// 4. DELETE : SUPPRIMER UTILISATEUR
// ==========================================
export async function DELETE(request: Request) {
    try {
      const admin = await checkSuperAdmin();
      if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("id");

      if (!userId) return NextResponse.json({ error: "ID requis" }, { status: 400 });

      // SÉCURITÉ : Anti-Suicide
      if (userId === admin.id) {
        return NextResponse.json({ error: "IMPOSSIBLE DE SUPPRIMER VOTRE COMPTE." }, { status: 409 });
      }

      // VÉRIFICATION D'INTÉGRITÉ
      const userToDelete = await prisma.user.findUnique({
          where: { id: userId },
          include: { 
              _count: { 
                  select: { leases: true, propertiesOwned: true, listings: true, bookings: true } 
              } 
          }
      });

      if (!userToDelete) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

      // Blocage si l'utilisateur a des données liées critiques
      if (userToDelete._count.leases > 0 || userToDelete._count.propertiesOwned > 0 || userToDelete._count.listings > 0) {
          return NextResponse.json({ 
              error: "Suppression refusée : Cet utilisateur possède des Baux, Propriétés ou Annonces actifs." 
          }, { status: 409 });
      }
  
      await prisma.user.delete({ where: { id: userId } });
  
      return NextResponse.json({ success: true, message: "Utilisateur supprimé" });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
    }
}
