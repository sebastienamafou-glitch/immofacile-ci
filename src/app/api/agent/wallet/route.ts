import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                finance: { select: { walletBalance: true } }, // 🔒 CORRECTION : Ciblage de la nouvelle table
                kyc: { select: { status: true } },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    select: {
                        id: true,
                        amount: true,
                        type: true,
                        reason: true,
                        status: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!agent || agent.role !== Role.AGENT) {
            return NextResponse.json({ error: "Accès refusé. Profil Agent requis." }, { status: 403 });
        }

        const responseData = {
            walletBalance: agent.finance?.walletBalance || 0, // 🔒 CORRECTION : Fallback sécurisé
            kycStatus: agent.kyc?.status || "PENDING",
            transactions: agent.transactions
        };

        return NextResponse.json({ success: true, data: responseData });

    } catch (error) {
        console.error("[API_AGENT_WALLET_GET]", error);
        return NextResponse.json({ error: "Erreur interne lors de la récupération du portefeuille." }, { status: 500 });
    }
}
