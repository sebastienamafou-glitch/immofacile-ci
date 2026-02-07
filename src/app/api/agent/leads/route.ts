import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// =====================================================================
// 1. GET : LISTER MES PROSPECTS
// =====================================================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (ID injecté par Middleware)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. VÉRIFICATION RÔLE
    const agent = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true } 
    });
    
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Accès réservé aux agents." }, { status: 403 });
    }

    // 3. REQUÊTE SÉCURISÉE (Mes prospects uniquement)
    const leads = await prisma.lead.findMany({
      where: {
        agentId: agent.id 
      },
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          name: true,
          phone: true,
          budget: true,
          status: true,
          needs: true, // ✅ Champ correct selon schema
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
// 2. POST : CRÉER UN PROSPECT
// =====================================================================
export async function POST(request: Request) {
  try {
    // 1. AUTH ZERO TRUST
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const agent = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { id: true, role: true } 
    });
    
    if (!agent || agent.role !== "AGENT") {
        return NextResponse.json({ error: "Interdit." }, { status: 403 });
    }

    // 2. VALIDATION
    const body = await request.json();
    if (!body.name || !body.phone) {
        return NextResponse.json({ error: "Nom et Téléphone requis." }, { status: 400 });
    }

    // 3. CRÉATION
    const newLead = await prisma.lead.create({
        data: {
            name: body.name,
            phone: body.phone,
            budget: body.budget ? Number(body.budget) : null,
            needs: body.needs || "",
            status: "NEW", 
            agentId: agent.id // ✅ Liaison sécurisée
        }
    });

    return NextResponse.json({ success: true, lead: newLead });

  } catch (error) {
    console.error("Erreur POST Lead:", error);
    return NextResponse.json({ error: "Erreur création prospect." }, { status: 500 });
  }
}

// =====================================================================
// 3. PUT : MISE À JOUR (Statut / Notes)
// =====================================================================
export async function PUT(request: Request) {
    try {
      const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
      if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  
      const body = await request.json();
      const { id, status, needs } = body;
  
      if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

      // SÉCURITÉ : Vérifier que le lead appartient à l'agent
      const existingLead = await prisma.lead.findFirst({
          where: { id: id, agentId: userId }
      });

      if (!existingLead) {
          return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });
      }
  
      const updatedLead = await prisma.lead.update({
          where: { id },
          data: {
              status: status || undefined,
              needs: needs || undefined
          }
      });
  
      return NextResponse.json({ success: true, lead: updatedLead });
  
    } catch (error) {
      console.error("Erreur PUT Lead:", error);
      return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
    }
}
