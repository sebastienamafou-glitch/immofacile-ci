import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ STANDARDISÉ ---
async function checkSuperAdminPermission(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  if (!userEmail) return { authorized: false, status: 401, error: "Non authentifié" };

  const admin = await prisma.user.findUnique({ 
    where: { email: userEmail },
    select: { role: true }
  });

  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    return { authorized: false, status: 403, error: "Accès réservé aux Super Admins" };
  }

  return { authorized: true };
}

// =====================================================================
// GET : LISTER LES ARTISANS (Annuaire)
// =====================================================================
export async function GET(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Récupération Optimisée
    const artisans = await prisma.user.findMany({
      where: { role: "ARTISAN" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        jobTitle: true, // ✅ Métier (Plombier, etc.)
        createdAt: true,
        kycStatus: true,
        isActive: true,
        _count: {
            select: { incidentsAssigned: true } // Charge de travail
        }
      }
    });

    return NextResponse.json({ success: true, artisans });

  } catch (error) {
    console.error("[API_ARTISANS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// POST : ENRÔLER UN ARTISAN
// =====================================================================
export async function POST(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Validation
    const body = await request.json(); // { name, phone, job, email? }
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    // 3. Sécurité : Génération Mot de Passe Fort
    const rawPassword = Math.random().toString(36).slice(-8) + "Pro!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 4. Logique Email (Si pas d'email, on en crée un technique)
    // Cela évite l'erreur "Unique constraint" sur le champ email
    const emailToUse = body.email && body.email.trim() !== "" 
        ? body.email 
        : `artisan-${body.phone.replace(/\s/g, '')}@immofacile.pro`;

    // 5. Création en Base
    const newArtisan = await prisma.user.create({
        data: {
            name: body.name,
            phone: body.phone,
            email: emailToUse,
            jobTitle: body.job || "Technicien Polyvalent",
            password: hashedPassword,
            role: "ARTISAN",
            kycStatus: "VERIFIED", // Un pro validé par l'admin est vérifié
            walletBalance: 0,
            isActive: true
        }
    });

    // 6. Réponse (Avec les identifiants en clair UNE SEULE FOIS)
    return NextResponse.json({ 
        success: true, 
        credentials: {
            name: newArtisan.name,
            phone: newArtisan.phone,
            email: emailToUse,
            password: rawPassword 
        }
    });

  } catch (error: any) {
    console.error("[API_ARTISANS_POST]", error);
    
    // Gestion propre des doublons
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce numéro de téléphone ou cet email est déjà utilisé." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur technique lors de la création." }, { status: 500 });
  }
}
