import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// 1. GET : Lister tous les agents (Avec stats)
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });

    // ✅ RÔLE STRICT SUPER_ADMIN
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kycStatus: true, // Important de savoir s'il est vérifié
        createdAt: true,
        _count: {
          select: { 
              missionsAccepted: true, // Combien de missions réalisées
              leads: true             // Combien de dossiers traités
          }
        }
      }
    });

    return NextResponse.json({ success: true, agents });

  } catch (error) {
    console.error("Erreur Admin Agents GET:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. POST : Créer un nouvel agent (Manuellement)
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ RÔLE STRICT ADMIN
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. VALIDATION
    const body = await request.json();

    if (!body.email || !body.password || !body.name) {
        return NextResponse.json({ error: "Email, Nom et Mot de passe requis." }, { status: 400 });
    }

    // 3. CRÉATION
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Gestion propre du téléphone (Empty string -> undefined) pour éviter l'erreur Unique Constraint
    const phoneToSave = body.phone && body.phone.trim() !== "" ? body.phone : undefined;

    const newAgent = await prisma.user.create({
        data: {
            email: body.email,
            phone: phoneToSave,
            name: body.name,
            password: hashedPassword,
            role: "AGENT",
            kycStatus: "VERIFIED", // Un agent créé par l'admin est de confiance
            walletBalance: 0
        }
    });

    // On retire le mot de passe de la réponse
    const { password, ...agentWithoutPassword } = newAgent;

    return NextResponse.json({ success: true, agent: agentWithoutPassword });

  } catch (error: any) {
    console.error("Erreur Création Agent:", error);

    // Gestion erreur doublon (P2002)
    if (error.code === 'P2002') {
        // On devine quel champ pose problème
        const target = error.meta?.target;
        if (target && target.includes('email')) {
            return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
        }
        if (target && target.includes('phone')) {
            return NextResponse.json({ error: "Ce numéro de téléphone est déjà utilisé." }, { status: 409 });
        }
        return NextResponse.json({ error: "Email ou Téléphone déjà existant." }, { status: 409 });
    }
    
    return NextResponse.json({ error: "Erreur serveur lors de la création." }, { status: 500 });
  }
}
