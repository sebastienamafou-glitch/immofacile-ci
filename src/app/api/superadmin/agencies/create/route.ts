import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs"; 
import { logActivity } from "@/lib/logger";
import { AuditAction } from "@prisma/client";

// =============================================================================
// 🛡️ TYPAGE STRICT (Aligné sur le SweetAlert front-end)
// =============================================================================
const createSaaSSchema = z.object({
  agencyName: z.string().min(2, "Le nom de l'agence est requis"),
  agencySlug: z.string().min(2, "Le slug est requis"),
  adminName: z.string().min(2, "Le nom de l'admin est requis"),
  adminEmail: z.string().email("Format d'email invalide"),
  adminPhone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. SÉCURITÉ PÉRIMÉTRIQUE (Zero Trust)
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (!admin || admin.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Accès refusé. Opération réservée au Super Admin." }, { status: 403 });
    }

    // 2. VALIDATION DES DONNÉES ENTRANTES
    const body = await req.json();
    const parsed = createSaaSSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { agencyName, agencySlug, adminName, adminEmail, adminPhone } = parsed.data;

    // 3. VÉRIFICATION DES DOUBLONS AVANT TRANSACTION
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé par un autre compte." }, { status: 400 });
    }

    const existingAgency = await prisma.agency.findUnique({ where: { slug: agencySlug } });
    if (existingAgency) {
      return NextResponse.json({ error: "Ce slug d'agence est déjà pris." }, { status: 400 });
    }

    // 4. GÉNÉRATION DES CREDENTIALS & SÉCURITÉ
    const tempPassword = Math.random().toString(36).slice(-8) + "A1!"; 
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const code = `AG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 5. TRANSACTION ATOMIQUE (Création SaaS complète)
    const newAgency = await prisma.$transaction(async (tx) => {
      // A. Création de la structure Agence
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          slug: agencySlug,
          code: code,
          isActive: true,
          primaryColor: "#FF7900", // Couleur par défaut du front-end
        }
      });

      // B. Création du Directeur (AGENCY_ADMIN) rattaché
      await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          phone: adminPhone || null,
          password: hashedPassword,
          role: Role.AGENCY_ADMIN,
          agencyId: agency.id,
          isVerified: true, 
        }
      });

      return agency;
    });

    // 6. TRAÇABILITÉ (Audit Log)
    await logActivity({
      action: AuditAction.AGENCY_CREATED,
      entityType: "AGENCY",
      userId: session.user.id,
      metadata: { agencyName, adminEmail, action: "CREATED_B2B_AGENCY" }
    });

    // 7. RÉPONSE ATTENDUE PAR LE SWEETALERT
    return NextResponse.json({ 
      success: true, 
      credentials: { 
        email: adminEmail, 
        tempPassword: tempPassword 
      } 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Erreur Création Agence B2B:", error);
    return NextResponse.json({ error: "Erreur interne du serveur lors de la création." }, { status: 500 });
  }
}
