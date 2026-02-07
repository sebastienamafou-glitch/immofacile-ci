import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function DashboardDispatcher() {
  // 1. On récupère la vraie session (déchiffrée depuis le cookie)
  const session = await auth();
  
  // 2. Vérification de sécurité
  if (!session || !session.user || !session.user.email) {
    return redirect("/login");
  }

  // 3. On récupère le rôle frais depuis la base de données
  // (C'est mieux que la session seule, car si on change ton rôle en admin, c'est immédiat)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  });

  if (!user) return redirect("/login");

  // 4. AIGUILLAGE
  switch (user.role) {
    case "SUPER_ADMIN": return redirect("/dashboard/superadmin");
    case "AGENCY_ADMIN": return redirect("/dashboard/agency"); 
    case "AGENT": return redirect("/dashboard/agent");
    case "OWNER": return redirect("/dashboard/owner");
    case "TENANT": return redirect("/dashboard/tenant");
    case "ARTISAN": return redirect("/dashboard/artisan");
    case "GUEST": return redirect("/dashboard/guest");
    case "INVESTOR": return redirect("/invest/dashboard"); 
    default: return redirect("/");
  }
}
