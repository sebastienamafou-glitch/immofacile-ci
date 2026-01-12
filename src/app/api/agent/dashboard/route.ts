import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton OK

// Indispensable pour que le Dashboard affiche des données fraîches à chaque visite
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : On identifie précisément qui fait la demande via le Middleware
    const userEmail = request.headers.get("x-user-email");
    
    if (!userEmail) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. RÉCUPÉRATION DE L'AGENT CONNECTÉ
    const agent = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        missionsAccepted: {
            where: { status: "COMPLETED" } // On compte ses missions terminées
        },
        leads: { 
            take: 5, 
            orderBy: { createdAt: 'desc' } // Ses derniers prospects
        }
      }
    });

    // Vérification stricte du rôle
    if (!agent || agent.role !== 'AGENT') {
       return NextResponse.json({ error: "Accès refusé. Profil Agent requis." }, { status: 403 });
    }

    // 3. STATISTIQUES DU MARCHÉ (Données globales accessibles aux agents)
    // Nombre de missions en attente dans la zone (ou globalement selon votre logique)
    const availableMissions = await prisma.mission.count({
        where: { 
            status: "PENDING",
            agentId: null // Uniquement celles qui n'ont pas encore été prises
        }
    });

    // 4. RÉPONSE STANDARDISÉE
    return NextResponse.json({
      success: true,
      user: {
        name: agent.name,
        email: agent.email,
        role: agent.role
      },
      stats: {
        completedMissions: agent.missionsAccepted.length,
        availableMissions: availableMissions,
        commissionEarned: agent.referralBalance || 0
      },
      recentLeads: agent.leads
    });

  } catch (error: any) {
    console.error("Erreur Agent Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur", details: error.message }, { status: 500 });
  }
}
