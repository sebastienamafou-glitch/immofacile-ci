import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

// GET : Historique complet (Incidents + Transactions)
export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    
    // ✅ Vérification Rôle
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès réservé aux propriétaires." }, { status: 403 });
    }

    // 2. RÉCUPÉRATION
    // A. Les incidents ayant un coût (Maintenance)
    const incidents = await prisma.incident.findMany({
      where: {
        property: { ownerId: owner.id },
        finalCost: { not: null, gt: 0 } // gt = greater than 0
      },
      include: { 
        property: { select: { title: true } } 
      },
      orderBy: { updatedAt: 'desc' }
    });

    // B. Les transactions de débit (Frais plateforme, etc.)
    const transactions = await prisma.transaction.findMany({
      where: { 
        userId: owner.id, 
        type: "DEBIT" 
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. FUSION ET FORMATAGE (Sans 'any')
    const expensesFromIncidents = incidents.map((inc) => ({
        id: `INC-${inc.id}`,
        date: inc.updatedAt,
        category: "MAINTENANCE",
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
        propertyTitle: "Compte Général", // Souvent lié au wallet, pas à un bien précis
        source: "WALLET"
    }));

    const expenseList = [...expensesFromIncidents, ...expensesFromTransactions];

    // Tri par date décroissante
    expenseList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, expenses: expenseList });

  } catch (error) {
    console.error("Erreur API Expenses:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : Ajouter une dépense manuelle
export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner || owner.role !== "OWNER") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { propertyId, amount, category, description } = body;

    // 2. VALIDATION DONNÉES
    if (!propertyId || !amount) {
        return NextResponse.json({ error: "Montant et Propriété requis" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (CRUCIAL !)
    // On vérifie que le bien appartient bien à celui qui déclare la dépense
    const property = await prisma.property.findFirst({
        where: {
            id: propertyId,
            ownerId: owner.id
        }
    });

    if (!property) {
        return NextResponse.json({ error: "Bien introuvable ou ne vous appartient pas." }, { status: 403 });
    }

    // 4. CRÉATION (Via astuce Incident Résolu)
    // C'est une bonne astuce pour lier la dépense au bien sans changer le schéma.
    const expense = await prisma.incident.create({
        data: {
            title: `[Dépense: ${category || 'AUTRE'}] ${description || 'Frais divers'}`,
            description: description || "Ajout manuel",
            status: "RESOLVED",
            priority: "NORMAL",
            finalCost: parseFloat(amount),
            photos: [], // Tableau vide obligatoire si défini dans le schema
            propertyId: property.id,
            reporterId: owner.id // Le propriétaire est le reporter
        }
    });

    return NextResponse.json({ success: true, expense });

  } catch (error) {
    console.error("Erreur Ajout Dépense:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
