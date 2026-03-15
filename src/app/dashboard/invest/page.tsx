import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/investor/DashboardView";
import { Role } from "@prisma/client"; // ✅ IMPORT DE L'ENUM STRICT

// ✅ 1. TYPAGE STRICT 100% FRONT-END
export interface InvestorDashboardData {
  id: string;
  name: string | null;
  email: string | null;
  walletBalance: number;
  backerTier: string;
  kycStatus: string;
  transactions: {
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: Date;
  }[];
  investmentContracts: {
    id: string;
    amount: number;
    status: string;
    roi: number;
    signedAt: Date;
  }[];
}

export default async function DashboardPage() {
  const session = await auth();
  
  // 1. VÉRIFICATION DE LA SESSION
  if (!session?.user?.id) redirect("/login");

  // 2. LE VIDEUR (EARLY EXIT) - SÉCURITÉ ZERO TRUST
  const userRole = session.user.role;
  if (userRole && userRole !== Role.INVESTOR && userRole !== Role.SUPER_ADMIN) {
      redirect("/dashboard"); // ✅ On redirige les curieux vers leur propre espace
  }

  // 3. REQUÊTE DB OPTIMISÉE (Uniquement si l'utilisateur est légitime)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true, // ✅ On récupère le rôle pour le hard-check
      backerTier: true,
      finance: { select: { walletBalance: true } },
      kyc: { select: { status: true } },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, amount: true, type: true, status: true, createdAt: true }
      },
      investmentContracts: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { signedAt: 'desc' },
        select: { id: true, amount: true, status: true, roi: true, signedAt: true }
      }
    }
  });

  if (!user) redirect("/login");

  // 4. HARD-CHECK (Au cas où le token de session serait obsolète)
  if (user.role !== Role.INVESTOR && user.role !== Role.SUPER_ADMIN) {
      redirect("/dashboard");
  }

  // 5. MAPPING DE SÉCURITÉ
  const safeUser: InvestorDashboardData = {
    id: user.id,
    name: user.name,
    email: user.email,
    walletBalance: Number(user.finance?.walletBalance || 0),
    backerTier: user.backerTier || "Investisseur",
    kycStatus: user.kyc?.status || "UNINITIALIZED",
    transactions: user.transactions.map(t => ({
        ...t,
        amount: Number(t.amount) 
    })),
    investmentContracts: user.investmentContracts.map(c => ({
        ...c,
        amount: Number(c.amount),
        roi: Number(c.roi || 0)
    }))
  };

  return <DashboardView user={safeUser} />;
}
