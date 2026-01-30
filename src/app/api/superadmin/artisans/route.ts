import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (ZERO TRUST - ID ONLY) ---
async function checkSuperAdminPermission(request: Request) {
  // 1. Identification par ID (Session via Middleware)
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
    return { authorized: false, status: 403, error: "Accès refusé. Réservé au Super Admin." };
  }

  return { authorized: true, admin };
}

// =====================================================================
// GET : LISTER LES ARTISANS
// =====================================================================
export async function GET(request: Request) {
  try {
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const artisans = await prisma.user.findMany({
      where: { role: "ARTISAN" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        jobTitle: true,
        createdAt: true,
        kycStatus: true,
        isActive: true,
        _count: {
            select: { incidentsAssigned: true }
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
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    // Génération Mot de Passe Fort
    const rawPassword = Math.random().toString(36).slice(-8) + "Pro!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Email Technique (si absent)
    const emailToUse = body.email && body.email.trim() !== "" 
        ? body.email 
        : `artisan-${body.phone.replace(/\s/g, '')}@immofacile.pro`;

    const newArtisan = await prisma.user.create({
        data: {
            name: body.name,
            phone: body.phone,
            email: emailToUse,
            jobTitle: body.job || "Technicien Polyvalent",
            password: hashedPassword,
            role: "ARTISAN",
            kycStatus: "VERIFIED",
            walletBalance: 0,
            isActive: true
        }
    });

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
    
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce numéro ou cet email existe déjà." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur technique." }, { status: 500 });
  }
}
