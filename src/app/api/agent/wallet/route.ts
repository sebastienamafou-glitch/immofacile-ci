import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. SÉCURITÉ PÉRIMÉTRIQUE (Auth v5)
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // 2. RÉCUPÉRATION DES DONNÉES (Optimisée)
        const agent = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                walletBalance: true,
                kyc: {
                    select: { status: true }
                },
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50, // Limite aux 50 dernières opérations pour la perf
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

        // 3. VÉRIFICATION DU RÔLE
        if (!agent || agent.role !== Role.AGENT) {
            return NextResponse.json({ error: "Accès refusé. Profil Agent requis." }, { status: 403 });
        }

        // 4. FORMATAGE DU DTO
        const responseData = {
            walletBalance: agent.walletBalance,
            kycStatus: agent.kyc?.status || "PENDING",
            transactions: agent.transactions
        };

        return NextResponse.json({ success: true, data: responseData });

    } catch (error) {
        console.error("[API_AGENT_WALLET_GET]", error);
        return NextResponse.json({ error: "Erreur interne lors de la récupération du portefeuille." }, { status: 500 });
    }
}
