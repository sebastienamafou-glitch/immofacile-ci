import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION AGENT (Optimisée avec 'select')
    const agent = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true, // Nécessaire pour les commissions
        
        // On compte les missions terminées
        _count: {
            select: { 
                missionsAccepted: { where: { status: "COMPLETED" } } 
            }
        },
        
        // On récupère les leads (mais uniquement les infos utiles)
        leads: { 
            take: 5, 
            orderBy: { createdAt: 'desc' }, // 'updatedAt' n'existe pas dans votre Lead model, j'ai remis 'createdAt'
            select: {
                id: true,
                name: true,
                phone: true,
                status: true,
                needs: true,
                budget: true
            }
        }
      }
    });

    // ✅ CHECK RÔLE STRICT
    if (!agent || agent.role !== 'AGENT') {
       return NextResponse.json({ error: "Accès refusé. Profil Agent requis." }, { status: 403 });
    }

    // 3. STATISTIQUES MARCHÉ
    // Combien de missions attendent un agent ?
    const availableMissions = await prisma.mission.count({
        where: { 
            status: "PENDING",
            agentId: null 
        }
    });

    // 4. RÉPONSE
    return NextResponse.json({
      success: true,
      user: {
        name: agent.name,
        email: agent.email,
        role: agent.role,
        walletBalance: agent.walletBalance
      },
      stats: {
        completedMissions: agent._count.missionsAccepted,
        availableMissions: availableMissions,
        commissionEarned: agent.walletBalance || 0 
      },
      recentLeads: agent.leads
    });

  } catch (error: any) {
    console.error("Erreur Agent Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
