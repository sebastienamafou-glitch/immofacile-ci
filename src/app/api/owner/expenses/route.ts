import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// ==========================================
// GET : Historique complet (Incidents + Transactions)
// ==========================================
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST (Via ID)
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION
    // A. Les incidents avec coût (Maintenance + Dépenses manuelles)
    const incidents = await prisma.incident.findMany({
      where: {
        property: { ownerId: userId }, // 🔒 Verrouillage Propriétaire
        finalCost: { not: null, gt: 0 } 
      },
      include: { 
        property: { select: { title: true } } 
      },
      orderBy: { updatedAt: 'desc' }
    });

    // B. Les transactions de débit (Frais plateforme, Retraits, etc.)
    const transactions = await prisma.transaction.findMany({
      where: { 
        userId: userId, // 🔒 Verrouillage Propriétaire
        type: "DEBIT" 
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. FUSION ET FORMATAGE
    const expensesFromIncidents = incidents.map((inc) => ({
        id: `INC-${inc.id}`,
        date: inc.updatedAt,
        category: inc.title.startsWith('[Dépense:') ? "MANUEL" : "MAINTENANCE", // Distinction visuelle
        description: inc.title,
        amount: inc.finalCost || 0,
        propertyTitle: inc.property.title,
        source: "INCIDENT"
    }));

    const expensesFromTransactions = transactions.map((tx) => ({
        id: `TX-${tx.id}`,
        date: tx.createdAt,
        category: "TRANSACTION",
        description: tx.reason || "Opération bancaire",
        amount: tx.amount,
        propertyTitle: "Global", 
        source: "WALLET"
    }));

    const expenseList = [...expensesFromIncidents, ...expensesFromTransactions];
    
    // Tri décroissant
    expenseList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, expenses: expenseList });

  } catch (error) {
    console.error("Erreur API Expenses:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// POST : Ajouter une dépense manuelle
// ==========================================
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { propertyId, amount, category, description } = body;

    // 2. VALIDATION DONNÉES
    if (!propertyId || !amount) {
        return NextResponse.json({ error: "Montant et Propriété requis" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (Anti-IDOR)
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            ownerId: userId // 🔒 Le bien doit appartenir à l'utilisateur connecté
        }
    });

    if (!property) {
        return NextResponse.json({ error: "Bien introuvable ou accès refusé." }, { status: 403 });
    }

    // 4. CRÉATION (Stockage via Incident Résolu)
    const expense = await prisma.incident.create({
        data: {
            title: `[Dépense: ${category || 'AUTRE'}] ${description || 'Frais divers'}`,
            description: description || "Ajout manuel depuis le dashboard",
            status: "RESOLVED",
            priority: "NORMAL",
            finalCost: parseFloat(amount),
            photos: [], // Tableau vide pour respecter le schéma
            propertyId: property.id,
            reporterId: userId // Le déclarant est le propriétaire
        }
    });

    return NextResponse.json({ success: true, expense });

  } catch (error) {
    console.error("Erreur Ajout Dépense:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
