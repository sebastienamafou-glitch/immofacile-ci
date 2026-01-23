import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // Assurez-vous d'avoir bcrypt ou argon2

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ : SEUL LE SUPER ADMIN PEUT FAIRE ÇA
    const userEmail = request.headers.get("x-user-email");
    const superAdmin = await prisma.user.findUnique({ where: { email: userEmail || "" } });

    if (!superAdmin || superAdmin.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: "Action réservée à la direction ImmoFacile." }, { status: 403 });
    }

    // 2. DONNÉES DU FORMULAIRE
    const body = await request.json();
    const { agencyName, agencySlug, adminName, adminEmail, adminPhone } = body;

    // 3. TRANSACTION DE CRÉATION (Agence + User Admin)
    const result = await prisma.$transaction(async (tx) => {
        
        // A. Créer l'entité Agence
        const newAgency = await tx.agency.create({
            data: {
                name: agencyName,
                slug: agencySlug, // ex: 'immo-prestige'
                isActive: true,   // Activé par défaut car créé par vous
                primaryColor: "#FF7900" // Orange par défaut
            }
        });

        // B. Créer le Compte Administrateur de l'Agence
        const tempPassword = Math.random().toString(36).slice(-8); // Génère un pass temporaire
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newAdmin = await tx.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                phone: adminPhone,
                password: hashedPassword,
                role: 'AGENCY_ADMIN', // Le grade suprême de l'agence
                agencyId: newAgency.id,
                isVerified: true, // Validé d'office
            }
        });

        return { agency: newAgency, user: newAdmin, tempPassword };
    });

    // 4. LOGIQUE D'ENVOI D'EMAIL (Simulation)
    // Ici, vous connecterez SendGrid/Resend pour envoyer :
    // "Bienvenue chez ImmoFacile. Votre accès : [email] / [tempPassword]"
    console.log(`📧 EMAIL À ENVOYER À ${adminEmail} : Pass=${result.tempPassword}`);

    return NextResponse.json({
        success: true,
        message: `Agence ${result.agency.name} créée avec succès.`,
        credentials: {
            email: result.user.email,
            tempPassword: result.tempPassword // À afficher une seule fois au SuperAdmin
        }
    });

  } catch (error: any) {
    console.error("Create Agency Error:", error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Ce nom d'agence ou cet email existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
