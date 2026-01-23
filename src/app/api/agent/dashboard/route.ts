import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION AGENT
    const agent = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        
        // Leads pour stats
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
       return NextResponse.json({ error: "Accès refusé. Profil Agent requis." }, { status: 403 });
    }

    // 3. CALCULS FINANCIERS AVANCÉS
    // On calcule la somme des "fees" des missions acceptées par l'agent mais pas encore payées (si applicable)
    // Ici on simplifie : Commission Estimée = Solde Wallet + Fees des missions en cours
    const pendingMissions = await prisma.mission.findMany({
        where: { agentId: agent.id, status: { in: ['ACCEPTED', 'PENDING'] } },
        select: { fee: true }
    });
    
    const pendingCommissions = pendingMissions.reduce((acc, m) => acc + (m.fee || 0), 0);
    const totalCommissionsEstimate = (agent.walletBalance || 0) + pendingCommissions;

    // 4. RÉPONSE FORMATÉE POUR LE FRONT
    return NextResponse.json({
      success: true,
      stats: {
        commissionEstimate: totalCommissionsEstimate,
        totalLeads: agent._count.leads,
        managedCount: agent._count.missionsAccepted,
        walletBalance: agent.walletBalance || 0
      },
      recentLeads: agent.leads
    });

  } catch (error: any) {
    console.error("Erreur Agent Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
