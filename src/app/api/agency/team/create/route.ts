import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";


export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (Plus de headers)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. VÉRIFICATION DROITS (Admin Agence)
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

    // 4. CRÉATION SÉCURISÉE (Multi-Tenant & Relationnelle)
    const hashedPassword = await hash("Babimmo2025!", 10); 

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
        
        isVerified: true, 
        
        // ✅ CORRECTION 1 : KYC dans sa table dédiée
        kyc: {
            create: {
                status: "VERIFIED", // Pré-vérifié par le directeur
                idType: "PROFESSIONAL_ID",
                documents: []
            }
        },

        // ✅ CORRECTION 2 : Initialisation Finance obligatoire
        finance: {
            create: {
                walletBalance: 0,
                kycTier: 2, // Agent = Tier 2 par défaut
                version: 1
            }
        }
      }
    });

    return NextResponse.json({ success: true, agent: { id: newAgent.id, name: newAgent.name } });

  } catch (error: any) {
    console.error("Erreur Création Agent:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
