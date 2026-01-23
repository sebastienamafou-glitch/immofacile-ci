import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import bcrypt from "bcryptjs"; 

export const dynamic = 'force-dynamic';

// GET : Lister les artisans
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ RÔLE STRICT
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION
    const artisans = await prisma.user.findMany({
      where: { role: "ARTISAN" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        jobTitle: true, // ✅ On récupère le métier proprement
        createdAt: true,
        kycStatus: true,
        // On compte les incidents assignés pour voir leur activité
        _count: {
            select: { incidentsAssigned: true }
        }
      }
    });

    return NextResponse.json({ success: true, artisans });

  } catch (error) {
    console.error("Erreur Admin Artisans:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : Créer un nouvel artisan
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
    }

    // 2. VALIDATION
    const body = await request.json(); // { name, phone, job, email? }

    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    // 3. GÉNÉRATION MOT DE PASSE
    const rawPassword = Math.random().toString(36).slice(-8) + "Pro!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 4. PRÉPARATION DONNÉES
    // Si pas d'email fourni, on en génère un fictif pour la contrainte unique de la DB
    const emailToUse = body.email && body.email.trim() !== "" 
        ? body.email 
        : `artisan-${body.phone.replace(/\s/g, '')}@immofacile.pro`;

    // 5. CRÉATION
    const newArtisan = await prisma.user.create({
        data: {
            name: body.name,
            phone: body.phone,
            email: emailToUse,
            jobTitle: body.job || "Artisan", // ✅ On utilise le champ dédié
            password: hashedPassword,
            role: "ARTISAN",
            kycStatus: "VERIFIED", // Un artisan créé par l'admin est vérifié par défaut
            walletBalance: 0
        }
    });

    return NextResponse.json({ 
        success: true, 
        credentials: {
            name: newArtisan.name,
            phone: newArtisan.phone,
            email: emailToUse,
            password: rawPassword // Renvoyé une seule fois pour affichage
        }
    });

  } catch (error: any) {
    console.error("Erreur Création Artisan:", error);
    
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce numéro de téléphone ou cet email est déjà utilisé." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erreur serveur lors de la création." }, { status: 500 });
  }
}
