import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        // ✅ ON GARDE LES RELATIONS (Tables liées)
        property: true,
        reporter: { select: { name: true, phone: true } },
        assignedTo: { select: { name: true, phone: true, jobTitle: true } },
        
        // ❌ ON RETIRE "photos: true" (Car c'est un champ simple, il vient tout seul)

        // ✅ ON GARDE LE DEVIS
        quote: {
            include: { 
                items: true, 
                artisan: { select: { name: true } } 
            }
        }
      }
    });

    if (!incident || incident.property.ownerId !== userId) {
       return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    return NextResponse.json({ success: true, incident });

  } catch (error: any) {
    console.error("Erreur GET Incident:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
