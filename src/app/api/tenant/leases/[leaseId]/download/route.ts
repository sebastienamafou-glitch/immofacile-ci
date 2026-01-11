import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

export async function GET(
  request: Request,
  { params }: { params: { leaseId: string } }
) {
  try {
    const { leaseId } = params;

    // 1. Récupération des données avec les relations correctes
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          include: { owner: true } // Pour avoir le nom du bailleur
        },
        tenant: true, // Pour avoir le nom du locataire
        // ✅ CORRECTION : On récupère les preuves de signature pour avoir la date
        signatures: true 
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 2. Initialisation du document PDF (A4)
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- EN-TÊTE ---
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE BAIL RÉSIDENTIEL", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Réf: ${lease.id.toUpperCase()}`, pageWidth / 2, 28, { align: "center" });

    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35); // Ligne de séparation

    // --- 1. LES PARTIES ---
    let y = 50;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. DÉSIGNATION DES PARTIES", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Le BAILLEUR (Propriétaire) :", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Nom : ${lease.property.owner?.name || "Agence ImmoFacile"}`, 25, y);
    y += 6;
    doc.text("Représenté par la plateforme ImmoFacile.", 25, y);

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text("Le PRENEUR (Locataire) :", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Nom : ${lease.tenant?.name || lease.tenant?.email || "Locataire non renseigné"}`, 25, y);
    y += 6;
    doc.text(`ID Client : ${lease.tenantId}`, 25, y);

    // --- 2. LE BIEN LOUÉ ---
    y += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. OBJET DU CONTRAT", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Le Bailleur donne en location les locaux situés à l'adresse suivante :", 20, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`${lease.property.address}, ${lease.property.commune}`, 25, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Type de bien : ${lease.property.title}`, 20, y);

    // --- 3. CONDITIONS FINANCIÈRES ---
    y += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. CONDITIONS FINANCIÈRES", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Loyer Mensuel : ${lease.monthlyRent.toLocaleString()} FCFA`, 25, y);
    y += 7;
    doc.text(`Dépôt de Garantie (Caution) : ${lease.depositAmount.toLocaleString()} FCFA`, 25, y);
    y += 7;
    doc.text("Périodicité du paiement : Mensuelle, avant le 05 du mois.", 25, y);

    // --- 4. DURÉE ---
    y += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("4. DURÉE DU BAIL", 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Le bail prend effet le : ${new Date(lease.startDate).toLocaleDateString("fr-FR")}`, 25, y);
    doc.text("Il est conclu pour une durée indéterminée, résiliable avec préavis de 3 mois.", 25, y + 7);

    // --- ZONE DE SIGNATURE ---
    y += 30;
    doc.setLineWidth(0.2);
    doc.rect(20, y, 80, 40); // Cadre Bailleur
    doc.rect(110, y, 80, 40); // Cadre Locataire

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Pour le Bailleur", 30, y + 10);
    doc.text("Pour le Locataire", 120, y + 10);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Signature électronique certifiée", 30, y + 35);
    
    // ✅ LOGIQUE CORRIGÉE : On cherche une preuve de signature
    const signatureProof = lease.signatures.length > 0 ? lease.signatures[0] : null;
    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED";

    if (isSigned && signatureProof) {
        doc.setTextColor(0, 150, 0); // Vert
        doc.text(`Signé le ${new Date(signatureProof.signedAt).toLocaleDateString()}`, 120, y + 35);
    } else {
        doc.setTextColor(200, 0, 0); // Rouge
        doc.text("EN ATTENTE DE SIGNATURE", 120, y + 35);
    }

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Document généré automatiquement par la plateforme ImmoFacile SaaS.", pageWidth / 2, 280, { align: "center" });

    // 3. Renvoi du PDF
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_ImmoFacile_${lease.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur production PDF:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la génération du contrat" },
      { status: 500 }
    );
  }
}
