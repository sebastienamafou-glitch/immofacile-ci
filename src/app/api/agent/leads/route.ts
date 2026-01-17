import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. GET : LISTER MES PROSPECTS (CRM PERSONNEL)
// =====================================================================
export async function GET(request: Request) {
  try {
    // A. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ RÔLE STRICT AGENT
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    // B. REQUÊTE SÉCURISÉE (Filtrage par agentId)
    const leads = await prisma.lead.findMany({
      where: {
        agentId: agent.id // 🔒 L'agent ne voit que SES prospects
      },
      // ✅ CORRECTION : Tri par 'createdAt' car 'updatedAt' n'existe pas dans le schéma Lead
      orderBy: { createdAt: 'desc' }, 
      select: {
          id: true,
          name: true,
          phone: true,
          // email: true, // Retiré car n'existe pas dans votre schema Lead actuel
          budget: true,
          // type: true,  // Retiré car n'existe pas dans votre schema Lead actuel
          status: true,
          // notes: true, // Retiré car n'existe pas dans votre schema Lead actuel
          createdAt: true
      }
    });

    return NextResponse.json({ success: true, leads });

  } catch (error) {
    console.error("Erreur GET Leads:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// 2. POST : CRÉER UN NOUVEAU PROSPECT
// =====================================================================
export async function POST(request: Request) {
  try {
    // A. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    // B. VALIDATION
    const body = await request.json();
    
    // Champs obligatoires minimaux
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et Téléphone sont obligatoires." }, { status: 400 });
    }

    // Nettoyage du budget (String -> Int)
    const budgetInt = body.budget ? parseInt(body.budget) : 0;

    // C. CRÉATION
    const newLead = await prisma.lead.create({
        data: {
            name: body.name,
            phone: body.phone,
            // email: body.email || null, // Champ inexistant dans schema
            budget: isNaN(budgetInt) ? 0 : budgetInt,
            // type: body.type || "Non spécifié", // Champ inexistant dans schema
            status: "NEW", 
            // notes: body.notes || "", // Champ inexistant dans schema
            needs: body.needs || "", // Utilisez 'needs' qui existe dans votre schema
            
            // ✅ LIAISON AUTOMATIQUE À L'AGENT CONNECTÉ
            agent: { connect: { id: agent.id } }
        }
    });

    return NextResponse.json({ success: true, lead: newLead });

  } catch (error) {
    console.error("Erreur POST Lead:", error);
    return NextResponse.json({ error: "Impossible de créer le prospect." }, { status: 500 });
  }
}

// =====================================================================
// 3. PUT : METTRE À JOUR LE STATUT (Suivi)
// =====================================================================
export async function PUT(request: Request) {
    try {
      // A. SÉCURITÉ
      const userEmail = request.headers.get("x-user-email");
      if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  
      const agent = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!agent || agent.role !== "AGENT") return NextResponse.json({ error: "Interdit" }, { status: 403 });
  
      const body = await request.json();
      const { id, status, needs } = body; // Remplacé 'notes' par 'needs'
  
      if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

      // B. VÉRIFICATION DE PROPRIÉTÉ (Anti-IDOR)
      const existingLead = await prisma.lead.findFirst({
          where: { id: id, agentId: agent.id }
      });

      if (!existingLead) {
          return NextResponse.json({ error: "Prospect introuvable ou ne vous appartient pas." }, { status: 404 });
      }
  
      // C. MISE À JOUR
      const updatedLead = await prisma.lead.update({
          where: { id },
          data: {
              status: status || undefined,
              needs: needs || undefined // Remplacé 'notes' par 'needs'
          }
      });
  
      return NextResponse.json({ success: true, lead: updatedLead });
  
    } catch (error) {
      console.error("Erreur PUT Lead:", error);
      return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
    }
  }
