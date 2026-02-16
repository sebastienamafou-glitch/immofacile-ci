'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setUserRole(role: string) {
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) return { success: false, error: "Non connecté" };

  // Validation des rôles autorisés
  const allowedRoles = ["TENANT", "OWNER", "AGENT", "GUEST"];
  if (!allowedRoles.includes(role)) {
    return { success: false, error: "Rôle invalide" };
  }

  try {
    // Mise à jour en base
    await prisma.user.update({
      where: { email: userEmail },
      data: { role: role as any } // Cast as any si l'enum Prisma est strict
    });

    // Détermination de la redirection
    let destination = "/dashboard";
    switch (role) {
        case "GUEST": destination = "/dashboard/guest"; break;
        case "OWNER": destination = "/dashboard/owner"; break;
        case "TENANT": destination = "/dashboard/tenant"; break;
        case "AGENT": destination = "/dashboard/agent"; break;
    }

    // On revalide pour que le middleware ou le layout prenne en compte le changement
    revalidatePath("/");
    
    return { success: true, redirectUrl: destination };

  } catch (error) {
    console.error("Erreur onboarding:", error);
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}
