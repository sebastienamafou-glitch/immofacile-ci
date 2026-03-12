import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/investor/DashboardView";

// ✅ 1. TYPAGE STRICT 100% FRONT-END (Zéro dépendance Prisma directe)
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
  if (!session?.user?.id) redirect("/login");

  // 2. Récupération optimisée en DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      backerTier: true,
      finance: { select: { walletBalance: true } },
      kyc: { select: { status: true } },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        // Sélection stricte pour alléger la requête
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

  // 3. Mapping de sécurité (Protection contre les crashs de sérialisation Decimal/Float)
  const safeUser: InvestorDashboardData = {
    id: user.id,
    name: user.name,
    email: user.email,
    walletBalance: Number(user.finance?.walletBalance || 0),
    backerTier: user.backerTier || "Investisseur",
    kycStatus: user.kyc?.status || "UNINITIALIZED",
    transactions: user.transactions.map(t => ({
        ...t,
        amount: Number(t.amount) // Sécurisation Decimal -> Number
    })),
    investmentContracts: user.investmentContracts.map(c => ({
        ...c,
        amount: Number(c.amount),
        roi: Number(c.roi || 0)
    }))
  };

  return <DashboardView user={safeUser} />;
}
