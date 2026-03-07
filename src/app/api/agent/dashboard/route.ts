import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ✅ BONNE PRATIQUE : On enveloppe la route avec `auth`
export const GET = auth(async (req) => {
  try {
    const session = req.auth;
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. VÉRIFICATION IDENTITÉ & RÔLE
    const agent = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        
        finance: {
            select: { walletBalance: true }
        },
        
        leads: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, phone: true, status: true }
        },
        _count: {
            select: { 
                leads: true,
                missionsAccepted: true 
            }
        }
      }
    });

    if (!agent || (agent.role !== 'AGENT' && agent.role !== 'SUPER_ADMIN')) {
       return NextResponse.json({ error: "Espace réservé aux agents immobiliers." }, { status: 403 });
    }

    // 3. CALCULS FINANCIERS
    const currentBalance = agent.finance?.walletBalance || 0;

    const activeMissions = await prisma.mission.findMany({
        where: { 
            agentId: agent.id, 
            status: 'ACCEPTED' 
        },
        select: { fee: true }
    });
    
    const pendingCommissions = activeMissions.reduce((acc, m) => acc + (m.fee || 0), 0);
    const totalCommissionsEstimate = currentBalance + pendingCommissions;

    return NextResponse.json({
      success: true,
      stats: {
        commissionEstimate: totalCommissionsEstimate,
        totalLeads: agent._count.leads,
        managedCount: agent._count.missionsAccepted,
        walletBalance: currentBalance
      },
      recentLeads: agent.leads
    });

  } catch (error) { // Typage strict : plus de 'any'
    console.error("Agent Dashboard API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
