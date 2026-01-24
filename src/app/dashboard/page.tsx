import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function DashboardDispatcher() {
  const userEmail = headers().get("x-user-email");
  
  if (!userEmail) return redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { role: true }
  });

  if (!user) return redirect("/login");

  // AIGUILLAGE
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
