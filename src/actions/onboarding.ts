// src/actions/onboarding.ts
'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export async function setUserRole(role: string) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Non connecté." };

  try {
    // 1. Vérification de l'état actuel de l'utilisateur en base
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { role: true }
    });

    if (!currentUser) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    // 2. SÉCURITÉ CRITIQUE : Rejet immédiat si le rôle n'est plus UNASSIGNED
    if (currentUser.role !== 'UNASSIGNED') {
      return { success: false, error: "Action refusée : votre profil est déjà configuré." };
    }

    // 3. Typage strict et validation du rôle demandé
    const allowedRoles: Role[] = ["TENANT", "OWNER", "AGENT", "GUEST"];
    
    if (!allowedRoles.includes(role as Role)) {
      return { success: false, error: "Rôle sélectionné invalide." };
    }

    const validRole = role as Role;

    // 4. Mutation sécurisée (Typage fort, aucun 'any')
    await prisma.user.update({
      where: { email: userEmail },
      data: { role: validRole }
    });

    // 5. Routage dynamique selon le rôle
    let destination = "/dashboard";
    switch (validRole) {
        case "GUEST": destination = "/dashboard/guest"; break;
        case "OWNER": destination = "/dashboard/owner"; break;
        case "TENANT": destination = "/dashboard/tenant"; break;
        case "AGENT": destination = "/dashboard/agent"; break;
    }

    revalidatePath("/");
    
    return { success: true, redirectUrl: destination };

  } catch (error: unknown) {
    console.error("Erreur setUserRole:", error);
    return { success: false, error: "Erreur serveur lors de la sauvegarde." };
  }
}
