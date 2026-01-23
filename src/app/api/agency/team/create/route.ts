import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt"; // Assurez-vous d'avoir 'npm i bcrypt' et '@types/bcrypt'

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Identification de l'Admin
    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { agency: true }
    });

    // On vérifie que c'est bien un Admin d'Agence et qu'il a une agence
    if (!admin || admin.role !== "AGENCY_ADMIN" || !admin.agencyId) {
      return NextResponse.json({ error: "Action réservée aux Directeurs d'Agence." }, { status: 403 });
    }

    // 2. VALIDATION DES DONNÉES
    const body = await req.json();
    const { name, email, phone, jobTitle } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } }); 
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }

    // 3. CRÉATION DE L'AGENT (Multi-Tenant)
    // Mot de passe par défaut (À changer par l'agent via "Mot de passe oublié" ou email d'invite)
    const hashedPassword = await hash("ImmoFacile2024!", 10); 

    const newAgent = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        jobTitle: jobTitle || "Agent Immobilier", //
        password: hashedPassword, // [cite: 4]
        role: "AGENT", // 
        agencyId: admin.agencyId, // 👈 CLÉ DU MULTI-TENANT : On lie force à l'agence de l'admin [cite: 13]
        isVerified: true, // On considère qu'un agent créé par le directeur est vérifié
      }
    });

    return NextResponse.json({ success: true, agent: newAgent });

  } catch (error: any) {
    console.error("Erreur Création Agent:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
