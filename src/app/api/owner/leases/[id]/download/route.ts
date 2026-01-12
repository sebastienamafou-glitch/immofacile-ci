import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CORRECTION 1 : Utiliser la version standalone qui inclut les polices (évite l'erreur ENOENT)
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  // CORRECTION 2 : Adaptation pour Next.js 14 (pas de Promise ici)
  { params }: { params: { id: string } }
) {
  try {
    // CORRECTION 2 (Suite) : Accès direct sans await
    const { id } = params;

    // 1. Récupération des données
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true 
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 2. Génération du PDF
    const pdfBuffer = await generateLeasePDF(lease);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_${lease.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération du PDF" }, { status: 500 });
  }
}

// Fonction utilitaire de dessin
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Instance du document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- A. EN-TÊTE LEGAL ---
    doc.font('Helvetica-Bold').fontSize(16)
       .text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    doc.moveDown(0.5);
    
    doc.font('Helvetica-Oblique').fontSize(10)
       .text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019 (Côte d'Ivoire)", { align: 'center' });
    doc.moveDown(1);

    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke();
    doc.moveDown(2);

    // --- B. IDENTIFICATION ---
    doc.font('Helvetica-Bold').fontSize(12).text("ENTRE LES SOUSSIGNÉS :");
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(11).text(`Le BAILLEUR :`, { continued: true });
    doc.font('Helvetica').text(` ${lease.property.owner?.name || "Propriétaire"}`);
    
    doc.moveDown(0.5);
    
    doc.font('Helvetica-Bold').text(`ET Le PRENEUR (Locataire) :`, { continued: true });
    doc.font('Helvetica').text(` ${lease.tenant?.name || "Locataire"}`);
    
    doc.moveDown(2);

    // --- C. OBJET (Fond Gris) ---
    const startY_Objet = doc.y;
    doc.rect(50, startY_Objet - 5, 495, 20).fill('#f3f4f6'); // Fond gris clair
    doc.fillColor('black').font('Helvetica-Bold').text("1. OBJET DU CONTRAT", 60, startY_Objet);
    doc.moveDown(1.5);

    doc.font('Helvetica').text(`Le Bailleur loue au Preneur le bien situé à : ${lease.property.address}, ${lease.property.commune}.`);
    doc.text(`Type de bien : ${lease.property.title}.`);
    doc.moveDown(2);

    // --- D. CONDITIONS FINANCIÈRES (Fond Gris) ---
    const startY_Finance = doc.y;
    doc.rect(50, startY_Finance - 5, 495, 20).fill('#f3f4f6');
    doc.fillColor('black').font('Helvetica-Bold').text("2. CONDITIONS FINANCIÈRES", 60, startY_Finance);
    doc.moveDown(1.5);

    const loyer = lease.monthlyRent ? lease.monthlyRent.toLocaleString('fr-FR') : "0";
    const caution = lease.depositAmount ? lease.depositAmount.toLocaleString('fr-FR') : "0";

    doc.font('Helvetica')
       .text(`- Loyer Mensuel : ${loyer} FCFA`)
       .text(`- Dépôt de Garantie (Caution) : ${caution} FCFA (Max 2 mois selon Art. 443)`)
       .text(`- Date de prise d'effet : ${new Date(lease.startDate).toLocaleDateString("fr-FR")}`);

    doc.moveDown(4);

    // --- E. ZONES DE SIGNATURE ---
    const ySign = doc.y;

    // Cadre Bailleur
    doc.rect(50, ySign, 200, 80).stroke();
    doc.font('Helvetica-Bold').text("Le BAILLEUR", 60, ySign + 10);

    // Cadre Preneur
    doc.rect(345, ySign, 200, 80).stroke();
    doc.font('Helvetica-Bold').text("Le PRENEUR", 355, ySign + 10);

    // Gestion de l'affichage de la signature
    const signatureProof = lease.signatures && lease.signatures.length > 0 ? lease.signatures[0] : null;
    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED";

    if (isSigned && signatureProof) {
        doc.fillColor('#166534') // Vert
           .text("SIGNÉ ÉLECTRONIQUEMENT", 355, ySign + 30)
           .font('Helvetica').fontSize(8)
           .text(`Le ${new Date(signatureProof.signedAt).toLocaleDateString()}`, 355, ySign + 45)
           .text(`IP: ${signatureProof.ipAddress}`, 355, ySign + 55);
    } else {
        doc.fillColor('#991b1b') // Rouge foncé
           .text("NON SIGNÉ", 355, ySign + 40);
    }

    doc.end();
  });
}
