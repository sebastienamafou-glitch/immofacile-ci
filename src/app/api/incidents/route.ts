import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST : Pour créer un nouvel incident
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, leaseId, type } = body;

    // 1. Validation de base
    if (!title || !leaseId) {
      return NextResponse.json({ error: "Titre et Contrat requis" }, { status: 400 });
    }

    // 2. On retrouve la Propriété via le Bail
    // (Un incident est lié à la maison, pas juste au contrat)
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { propertyId: true, tenantId: true }
    });

    if (!lease) {
      return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    }

    // 3. Création de l'incident
    const newIncident = await prisma.incident.create({
      data: {
        title,
        description: description || "",
        status: "REPORTED", // Statut par défaut : "Signalé"
        priority: "MEDIUM", // Priorité par défaut
        property: { connect: { id: lease.propertyId } },
        tenant: { connect: { id: lease.tenantId } }
      }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("Erreur création incident:", error);
    return NextResponse.json({ success: false, error: "Impossible de créer l'incident" }, { status: 500 });
  }
}

// GET : Pour que l'admin ou le proprio voit la liste des incidents
export async function GET(request: Request) {
    try {
        const incidents = await prisma.incident.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                property: { select: { title: true, address: true } },
                tenant: { select: { name: true, phone: true } }
            }
        });
        return NextResponse.json({ success: true, data: incidents });
    } catch (error) {
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
