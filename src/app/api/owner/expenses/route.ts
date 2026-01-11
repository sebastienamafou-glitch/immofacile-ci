import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET (Déjà fait - Je remets la version corrigée TS)
export async function GET(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const incidents = await prisma.incident.findMany({
      where: {
        property: { ownerId: owner.id },
        finalCost: { not: null, gt: 0 } // Syntaxe corrigée
      },
      include: { property: { select: { title: true } } }
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: owner.id, type: "DEBIT" },
      orderBy: { createdAt: 'desc' }
    });

    const expenseList = [
        ...incidents.map((inc: any) => ({
            id: `INC-${inc.id}`,
            date: inc.updatedAt,
            category: "MAINTENANCE",
            description: inc.title,
            amount: inc.finalCost || 0,
            propertyTitle: inc.property.title
        })),
        ...transactions.map((tx: any) => ({
            id: `TX-${tx.id}`,
            date: tx.createdAt,
            category: "TRANSACTION",
            description: tx.reason || "Opération",
            amount: tx.amount,
            propertyTitle: null 
        }))
    ];

    expenseList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, expenses: expenseList });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST (Nouvelle fonctionnalité pour ajouter une dépense)
export async function POST(request: Request) {
  try {
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const body = await request.json();
    const { propertyId, amount, category, description } = body;

    if (!propertyId || !amount) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // ASTUCE : On crée un Incident résolu pour simuler une dépense liée à un bien
    const expense = await prisma.incident.create({
        data: {
            title: `[Dépense: ${category}] ${description}`, // On prefixe pour s'y retrouver
            description: description || "Dépense enregistrée manuellement",
            status: "RESOLVED", // Considéré comme traité/payé
            priority: "NORMAL",
            finalCost: parseFloat(amount), // C'est ici qu'on stocke le montant
            property: { connect: { id: propertyId } },
            reporter: { connect: { id: owner.id } }
        }
    });

    return NextResponse.json({ success: true, expense });

  } catch (error) {
    console.error("Erreur Ajout Dépense:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
