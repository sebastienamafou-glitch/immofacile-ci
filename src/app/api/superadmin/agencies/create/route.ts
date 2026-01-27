import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (Via ID)
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // Vérification du rôle SUPER_ADMIN
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Action réservée à la direction ImmoFacile." }, { status: 403 });
    }

    // 2. DONNÉES DU FORMULAIRE
    const body = await request.json();
    const { agencyName, agencySlug, adminName, adminEmail, adminPhone } = body;

    // Validation basique
    if (!agencyName || !agencySlug || !adminEmail) {
        return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    // 3. GÉNÉRATION DU CODE AGENCE (Obligatoire)
    // Ex: "immo-prestige" devient "IMMO-PRESTIGE"
    const agencyCode = agencySlug.toUpperCase().trim().replace(/\s+/g, '-');

    // 4. TRANSACTION DE CRÉATION
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Créer l'entité Agence
        const newAgency = await tx.agency.create({
            data: {
                name: agencyName,
                slug: agencySlug,
                code: agencyCode, // ✅ AJOUT DU CHAMP OBLIGATOIRE
                isActive: true,
                primaryColor: "#FF7900"
            }
        });

        // B. Créer le Compte Administrateur de l'Agence
        const tempPassword = Math.random().toString(36).slice(-8); 
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newAdmin = await tx.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                phone: adminPhone,
                password: hashedPassword,
                role: 'AGENCY_ADMIN', 
                agencyId: newAgency.id,
                isVerified: true, 
                kycStatus: 'VERIFIED'
            }
        });

        return { agency: newAgency, user: newAdmin, tempPassword };
    });

    console.log(`📧 [SIMULATION] Admin créé pour ${result.agency.name} | Pass: ${result.tempPassword}`);

    return NextResponse.json({
        success: true,
        message: `Agence ${result.agency.name} (Code: ${result.agency.code}) créée.`,
        credentials: {
            email: result.user.email,
            tempPassword: result.tempPassword 
        }
    });

  } catch (error: any) {
    console.error("Create Agency Error:", error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce nom, ce code ou cet email existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
