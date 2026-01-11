import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

export async function GET(
  request: Request,
  { params }: { params: { leaseId: string } } // Correction : On utilise leaseId pour matcher le dossier
) {
  try {
    const { leaseId } = params;

    // 1. Récupération des données avec les relations
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: {
          include: { owner: true }
        },
        tenant: true,
        signatures: true 
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 2. Initialisation du document PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20; // Curseur vertical

    // Fonction utilitaire pour gérer les textes longs
    const addParagraph = (text: string, fontSize = 10, fontType = "normal") => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontType);
        const splitText = doc.splitTextToSize(text, contentWidth);
        
        if (y + (splitText.length * 5) > 280) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 3;
    };

    // --- EN-TÊTE LEGAL ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE BAIL À USAGE D'HABITATION", pageWidth / 2, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019 (Côte d'Ivoire)", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- 1. IDENTIFICATION ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTRE LES SOUSSIGNÉS :", margin, y);
    y += 10;

    addParagraph(`Le BAILLEUR : ${lease.property.owner?.name || "Propriétaire"}`, 11, "bold");
    y += 5;
    addParagraph(`ET Le PRENEUR (Locataire) : ${lease.tenant?.name || "Locataire"}`, 11, "bold");
    y += 10;

    // --- 2. OBJET ---
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.setTextColor(0);
    doc.text("1. OBJET DU CONTRAT", margin + 2, y + 1);
    y += 10;

    addParagraph(`Le Bailleur loue au Preneur le bien situé à : ${lease.property.address}, ${lease.property.commune}.`);
    addParagraph(`Type de bien : ${lease.property.title}.`);

    // --- 3. CONDITIONS FINANCIÈRES ---
    y += 5;
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.text("2. CONDITIONS FINANCIÈRES", margin + 2, y + 1);
    y += 10;

    const loyer = lease.monthlyRent.toLocaleString('fr-FR');
    const caution = lease.depositAmount.toLocaleString('fr-FR');

    addParagraph(`- Loyer Mensuel : ${loyer} FCFA`);
    addParagraph(`- Dépôt de Garantie (Caution) : ${caution} FCFA (Max 2 mois selon Art. 443)`);
    addParagraph(`- Date de prise d'effet : ${new Date(lease.startDate).toLocaleDateString("fr-FR")}`);

    // --- SIGNATURES ---
    y += 30;
    doc.setLineWidth(0.2);
    doc.rect(margin, y, 80, 40); 
    doc.rect(pageWidth - margin - 80, y, 80, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Le BAILLEUR", margin + 10, y + 10);
    doc.text("Le PRENEUR", pageWidth - margin - 70, y + 10);

    // Gestion Signature
    const signatureProof = lease.signatures.length > 0 ? lease.signatures[0] : null;
    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED"; // Check status AND boolean

    if (isSigned && signatureProof) {
        doc.setTextColor(0, 128, 0); // Vert
        doc.text(`Signé le ${new Date(signatureProof.signedAt).toLocaleDateString()}`, pageWidth - margin - 75, y + 25);
    } else {
        doc.setTextColor(200, 0, 0); // Rouge
        doc.text("NON SIGNÉ", pageWidth - margin - 60, y + 25);
    }

    // 3. Renvoi du PDF
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_${lease.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
