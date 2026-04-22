"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role, AuditAction } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logger";


// 1. VALIDATION STRICTE (Zod)
const createAgencySchema = z.object({
  name: z.string().min(2, "Le nom de l'agence est trop court"),
  email: z.string().email("Format d'email invalide").optional().or(z.literal("")),
  directorEmail: z.string().email("L'email du directeur est requis"),
  taxId: z.string().optional().or(z.literal("")),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;

export async function createAgencyAndAssignDirector(input: CreateAgencyInput) {
  // 2. SÉCURITÉ PÉRIMÉTRIQUE (Réservé au Super Admin)
  const session = await auth();
  if (session?.user?.role !== Role.SUPER_ADMIN) {
    return { success: false, error: "Accès refusé. Opération réservée au Super Admin." };
  }

  const parsed = createAgencySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, directorEmail, taxId } = parsed.data;

  try {
    // 3. TRANSACTION ATOMIQUE (Si une étape échoue, tout est annulé)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Vérification de l'existence du futur directeur
      const futureDirector = await tx.user.findUnique({
        where: { email: directorEmail }
      });

      if (!futureDirector) {
        throw new Error("Utilisateur introuvable. Le directeur doit d'abord se créer un compte standard.");
      }

      if (futureDirector.agencyId) {
        throw new Error("Cet utilisateur est déjà rattaché à une agence existante.");
      }

      // B. Génération des identifiants uniques de l'agence
      const slugBase = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
      const uniqueHash = Math.random().toString(36).substring(2, 6);
      const slug = `${slugBase}-${uniqueHash}`;
      const code = `AG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // C. Création de l'entité Agence
      const newAgency = await tx.agency.create({
        data: {
          name: name,
          email: email || null,
          slug: slug,
          code: code,
          taxId: taxId || null,
          isActive: true, // Approuvé par défaut puisque créé par le Super Admin
          primaryColor: "#FF7900",
        }
      });

      // D. Surclassement de l'utilisateur en AGENCY_ADMIN et rattachement
      await tx.user.update({
        where: { id: futureDirector.id },
        data: {
          role: Role.AGENCY_ADMIN,
          agencyId: newAgency.id
        }
      });

      return newAgency;
    });

    // 4. TRAÇABILITÉ (Audit Log)
    await logActivity({
      action: AuditAction.PROPERTY_CREATED, // 🔒 CORRECTION : Strict schema (Faute de AGENCY_CREATED)
      entityId: result.id,
      entityType: "AGENCY",
      userId: session.user.id,
      metadata: { action_reelle: "AGENCY_CREATED", agencyName: result.name, directorEmail: directorEmail }
    });

    revalidatePath("/dashboard/superadmin/agencies");
    return { success: true, agencyId: result.id };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur lors de la création de l'agence.";
    return { success: false, error: errorMessage };
  }
}
