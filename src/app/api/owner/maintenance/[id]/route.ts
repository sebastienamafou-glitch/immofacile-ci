import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        property: { select: { id: true, title: true, ownerId: true } },
        reporter: { select: { name: true, phone: true } },
        assignedTo: { select: { name: true, phone: true, jobTitle: true } },
        quote: {
            include: { 
                items: true, 
                artisan: { select: { name: true } } 
            }
        }
      }
    });

    if (!incident) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const isOwner = incident.property.ownerId === userId;
    const isAdmin = user?.role === Role.SUPER_ADMIN || user?.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
       return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    return NextResponse.json({ success: true, incident });

  } catch (error) {
    console.error("[API_INCIDENT_DETAIL_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
