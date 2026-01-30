import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// --- HELPER SÉCURITÉ (ZERO TRUST) ---
async function checkSuperAdmin(request: Request) {
  // 1. Identification par ID (Session via Middleware)
  const userId = request.headers.get("x-user-id");
  if (!userId) return null;

  // 2. Vérification Rôle
  const admin = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true } 
  });

  if (!admin || admin.role !== "SUPER_ADMIN") return null;

  return admin;
}

// ==========================================
// 1. GET : LISTER LES AGENTS
// ==========================================
export async function GET(request: Request) {
  try {
    const admin = await checkSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

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
        // KPI Agents
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

// ==========================================
// 2. POST : RECRUTER UN AGENT
// ==========================================
export async function POST(request: Request) {
  try {
    const admin = await checkSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await request.json();
    if (!body.email || !body.password || !body.name) {
        return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    // Hashage
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Nettoyage Téléphone (si vide, on met null/undefined pour éviter conflit unique)
    const phoneToSave = body.phone && body.phone.trim() !== "" ? body.phone : undefined;

    const newAgent = await prisma.user.create({
        data: {
            email: body.email,
            phone: phoneToSave,
            name: body.name,
            password: hashedPassword,
            role: "AGENT",
            // Un agent créé par le Super Admin est considéré comme vérifié
            kycStatus: "VERIFIED", 
            isVerified: true,
            walletBalance: 0,
            isActive: true
        }
    });

    // On retire le hash de la réponse
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
