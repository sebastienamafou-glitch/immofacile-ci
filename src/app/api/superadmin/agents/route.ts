import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (Standardisé) ---
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
// GET : LISTER TOUS LES AGENTS (Avec KPI)
// =====================================================================
export async function GET(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Récupération Optimisée
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kycStatus: true,
        createdAt: true,
        _count: {
          select: { 
              missionsAccepted: true, 
              leads: true 
          }
        }
      }
    });

    return NextResponse.json({ success: true, agents });

  } catch (error) {
    console.error("[API_AGENTS_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// POST : CRÉER UN AGENT (Recrutement)
// =====================================================================
export async function POST(request: Request) {
  try {
    // 1. Sécurité
    const auth = await checkSuperAdminPermission(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // 2. Validation Input
    const body = await request.json();
    if (!body.email || !body.password || !body.name) {
        return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    // 3. Hashage Password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // 4. Création (Gestion téléphone vide)
    const phoneToSave = body.phone && body.phone.trim() !== "" ? body.phone : undefined;

    const newAgent = await prisma.user.create({
        data: {
            email: body.email,
            phone: phoneToSave,
            name: body.name,
            password: hashedPassword,
            role: "AGENT",
            kycStatus: "VERIFIED", // Un agent créé par l'admin est "Vérifié" d'office
            walletBalance: 0,
            isActive: true
        }
    });

    // 5. Sécurité : On retire le hash avant de répondre
    // @ts-ignore
    const { password, ...agentSafe } = newAgent;

    return NextResponse.json({ success: true, agent: agentSafe });

  } catch (error: any) {
    console.error("[API_AGENTS_POST]", error);

    // Gestion Erreur Doublon (Prisma P2002)
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target)) {
            if (target.includes('email')) return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
            if (target.includes('phone')) return NextResponse.json({ error: "Ce numéro est déjà utilisé." }, { status: 409 });
        }
        return NextResponse.json({ error: "Email ou Téléphone déjà existant." }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur technique lors de la création." }, { status: 500 });
  }
}
