import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur (v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. VÉRIFICATION IDENTITÉ & RÔLE
    const agent = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        
        // ✅ CORRECTION SCHEMA : On passe par la relation Finance
        finance: {
            select: { walletBalance: true }
        },
        
        // Leads récents (Top 5)
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

    if (!agent || agent.role !== 'AGENT') {
       return NextResponse.json({ error: "Espace réservé aux agents immobiliers." }, { status: 403 });
    }

    // 3. CALCULS FINANCIERS
    // ✅ Récupération sécurisée du solde via la relation
    const currentBalance = agent.finance?.walletBalance || 0;

    // On cherche les missions acceptées par l'agent dont le statut n'est pas encore 'COMPLETED'
    const activeMissions = await prisma.mission.findMany({
        where: { 
            agentId: agent.id, 
            status: { in: ['ACCEPTED'] } 
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
        walletBalance: currentBalance // ✅ Valeur corrigée
      },
      recentLeads: agent.leads
    });

  } catch (error: any) {
    console.error("Agent Dashboard API Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
