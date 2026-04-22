import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireKyc } from "@/lib/gatekeeper";
import { MandateStatus, SignatureStatus } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const userId = session.user.id;
    const { propertyId } = params;

    // 1. Sécurité Gatekeeper (KYC obligatoire pour déléguer)
    try {
      await requireKyc(userId);
    } catch (e) {
      return NextResponse.json({ 
        error: "Action refusée : Identité non vérifiée.", 
        code: "KYC_REQUIRED" 
      }, { status: 403 });
    }

    // 2. Récupération des données du corps de la requête
    const { agencyCode, commissionRate } = await req.json();

    if (!agencyCode || !commissionRate) {
      return NextResponse.json({ error: "Code agence et taux de commission requis" }, { status: 400 });
    }

    // 3. Trouver l'agence par son code
    const agency = await prisma.user.findFirst({
      where: { 
        id: agencyCode,
        role: "AGENCY_ADMIN" 
      }
    });

    if (!agency) {
      return NextResponse.json({ error: "Agence introuvable avec ce code" }, { status: 404 });
    }

    // 4. TRANSACTION ATOMIQUE : Création du mandat + Transfert du bien
    const result = await prisma.$transaction(async (tx) => {
      // A. Vérifier que le bien appartient bien à l'user et n'est pas déjà délégué
      const property = await tx.property.findUnique({
        where: { id: propertyId, ownerId: userId }
      });

      if (!property) throw new Error("Bien introuvable ou déjà sous gestion");

      // B. Création du Mandat de Gestion
      const mandate = await tx.managementMandate.create({
        data: {
          propertyId,
          ownerId: userId,
          agencyId: agency.id,
          commissionRate: parseFloat(commissionRate),
          status: "PENDING",
          signatureStatus: "PENDING"
        }
      });

      // C. Mise à jour de la propriété (Liaison Agence)
      await tx.property.update({
        where: { id: propertyId },
        data: { agencyId: agency.id }
      });

      return mandate;
    });

    // 5. ENVOI DE LA NOTIFICATION AU DIRECTEUR DE L'AGENCE
    await sendNotification({
      userId: agency.id,
      title: "Nouvelle opportunité de gestion 🏢",
      message: `Un propriétaire souhaite vous confier son bien en gestion. Taux proposé : ${commissionRate}%.`,
      type: "INFO",
      link: "/dashboard/agency/mandates" 
    });

    return NextResponse.json({ 
      success: true, 
      message: "Demande de délégation envoyée à l'agence", 
      mandate: result 
    });

  } catch (error: unknown) {
    console.error("Erreur Délégation:", error);
    return NextResponse.json({ error: (error as Error).message || "Erreur serveur" }, { status: 500 });
  }
}
