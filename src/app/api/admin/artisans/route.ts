import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// GET : Lister les artisans
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // On récupère tous les users qui ont le rôle ARTISAN
    const artisans = await prisma.user.findMany({
      where: { role: "ARTISAN" },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
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
    const userEmail = request.headers.get("x-user-email");
    const body = await request.json(); // { name, phone, job, location }

    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // Validation
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et téléphone requis" }, { status: 400 });
    }

    // Génération mot de passe aléatoire sécurisé
    const rawPassword = Math.random().toString(36).slice(-8) + "Pro!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Comme on n'a pas de champ 'job' dans le User model, on l'ajoute au nom pour l'instant
    // Ex: "Moussa (Plombier)"
    const fullName = body.job ? `${body.name} (${body.job})` : body.name;
    const emailFictif = `artisan-${body.phone}@immofacile.pro`; // Email généré si pas fourni

    const newArtisan = await prisma.user.create({
        data: {
            name: fullName,
            phone: body.phone,
            email: body.email || emailFictif, 
            password: hashedPassword,
            role: "ARTISAN",
            kycStatus: "VERIFIED"
        }
    });

    return NextResponse.json({ 
        success: true, 
        credentials: {
            name: newArtisan.name,
            phone: newArtisan.phone,
            password: rawPassword // On renvoie le mdp brut UNE SEULE FOIS pour l'affichage
        }
    });

  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') return NextResponse.json({ error: "Ce numéro est déjà inscrit." }, { status: 409 });
    return NextResponse.json({ error: "Erreur création" }, { status: 500 });
  }
}
