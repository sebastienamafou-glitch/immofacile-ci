import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // Assurez-vous d'avoir 'bcryptjs' installé

export const dynamic = 'force-dynamic';

// 1. GET : Lister tous les agents
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { missionsAccepted: true, leads: true } // Stats rapides
        }
      }
    });

    return NextResponse.json({ success: true, agents });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 2. POST : Créer un nouvel agent
export async function POST(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    const body = await request.json();

    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    // Vérif Admin
    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // Validation basique
    if (!body.email || !body.password || !body.name) {
        return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // Hashage
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Création
    const newAgent = await prisma.user.create({
        data: {
            email: body.email,
            phone: body.phone,
            name: body.name,
            password: hashedPassword,
            role: "AGENT",
            kycStatus: "VERIFIED" // Un agent créé par l'admin est d'office vérifié
        }
    });

    return NextResponse.json({ success: true, agent: newAgent });

  } catch (error: any) {
    // Gestion erreur doublon (P2002 chez Prisma)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Cet email ou téléphone existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur création agent" }, { status: 500 });
  }
}
