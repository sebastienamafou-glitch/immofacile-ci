import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs"; // Préférez bcryptjs pour éviter les soucis de compilation native

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION ADMIN AGENCE
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, agencyId: true }
    });

    // Seul un Admin d'agence (ou Super Admin) peut créer des agents pour SON agence
    if (!admin || !admin.agencyId || (admin.role !== "AGENCY_ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Action réservée aux Directeurs d'Agence." }, { status: 403 });
    }

    // 3. VALIDATION
    const body = await req.json();
    const { name, email, phone, jobTitle } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Nom, email et téléphone requis." }, { status: 400 });
    }

    // Vérifier unicité email
    const existingUser = await prisma.user.findUnique({ where: { email } }); 
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
    }

    // 4. CRÉATION SÉCURISÉE (Multi-Tenant)
    // Mot de passe par défaut
    const hashedPassword = await hash("ImmoFacile2025!", 10); 

    const newAgent = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        jobTitle: jobTitle || "Agent Immobilier",
        password: hashedPassword,
        role: "AGENT", 
        
        // 🔒 VERROUILLAGE SUR L'AGENCE DE L'ADMIN
        agencyId: admin.agencyId, 
        
        isVerified: true, // Pré-vérifié par le directeur
        kycStatus: "VERIFIED"
      }
    });

    // TODO: Envoyer email d'invitation ici (SendGrid/Resend)

    return NextResponse.json({ success: true, agent: { id: newAgent.id, name: newAgent.name } });

  } catch (error: any) {
    console.error("Erreur Création Agent:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
