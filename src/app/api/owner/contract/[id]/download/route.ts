import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ Utilisation de la version standalone pour éviter les bugs de police sur le serveur
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  // Correction pour Next.js 14 : accès direct aux params sans Promise
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Récupération des données du bail
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { include: { owner: true } },
        tenant: true
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 2. Génération du PDF
    const pdfBuffer = await generateLeasePDF(lease);

    // 3. Renvoi du fichier au navigateur
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        // Le nom du fichier qui sera téléchargé
        "Content-Disposition": `attachment; filename="Bail_Certifie_${lease.id.substring(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
  }
}

// --- MOTEUR DE GÉNÉRATION DU PDF (STYLE PRO) ---
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Création document A4 avec marges
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    // Capture du flux de données
    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- DEBUT DU DESSIN ---

    // 1. EN-TÊTE
    doc.font('Times-Bold').fontSize(20).text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Times-Italic').fontSize(10).fillColor('#666666').text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019", { align: 'center' });
    doc.moveDown(2);

    // 2. PARTIES (CADRE GRIS)
    const startY = doc.y;
    // Fond gris clair
    doc.rect(50, startY, 495, 100).fillColor('#f9fafb').fill();
    // Bordure
    doc.strokeColor('#d1d5db').rect(50, startY, 495, 100).stroke();
    
    doc.fillColor('#000000'); // Retour au noir pour le texte
    
    // Colonne Gauche : Bailleur
    doc.font('Times-Bold').fontSize(9).text("DÉSIGNATION DU BAILLEUR :", 70, startY + 15);
    doc.font('Times-Bold').fontSize(12).text(lease.property.owner.name.toUpperCase(), 70, startY + 30);
    doc.font('Times-Roman').fontSize(10).text(`Email : ${lease.property.owner.email}`, 70, startY + 45);
    if(lease.property.owner.phone) doc.text(`Tél : ${lease.property.owner.phone}`, 70, startY + 60);

    // Colonne Droite : Preneur
    doc.font('Times-Bold').fontSize(9).text("DÉSIGNATION DU PRENEUR :", 300, startY + 15);
    doc.font('Times-Bold').fontSize(12).text(lease.tenant.name.toUpperCase(), 300, startY + 30);
    doc.font('Times-Roman').fontSize(10).text(`Email : ${lease.tenant.email}`, 300, startY + 45);
    if(lease.tenant.phone) doc.text(`Tél : ${lease.tenant.phone}`, 300, startY + 60);

    doc.moveDown(8);

    // 3. ARTICLES DU CONTRAT
    const addArticle = (title: string, content: string) => {
        doc.moveDown(1);
        doc.font('Times-Bold').fontSize(11).text(title, { underline: true });
        doc.moveDown(0.5);
        doc.font('Times-Roman').fontSize(11).text(content, { align: 'justify', width: 495, lineGap: 2 });
    };

    addArticle("ARTICLE 1 : OBJET DU CONTRAT", 
        `Le Bailleur donne en location au Preneur les locaux situés à : ${lease.property.address}, ${lease.property.commune}. \nLe bien est désigné comme suit : ${lease.property.title}.`
    );

    addArticle("ARTICLE 2 : DURÉE", 
        `Le présent bail est consenti pour une durée d'un (1) an renouvelable par tacite reconduction, prenant effet le ${new Date(lease.startDate).toLocaleDateString("fr-FR", {dateStyle: 'long'})}.`
    );

    addArticle("ARTICLE 3 : LOYER ET CHARGES", 
        `Le loyer mensuel est fixé à la somme de ${lease.monthlyRent.toLocaleString()} FCFA, payable d'avance. Le dépôt de garantie est fixé à ${lease.depositAmount.toLocaleString()} FCFA.`
    );

    addArticle("ARTICLE 4 : OBLIGATIONS", 
        "Le Preneur s'engage à payer le loyer, à user paisiblement des lieux, et à répondre des dégradations. Le Bailleur s'engage à fournir un logement décent et à assurer la jouissance paisible."
    );

    // 4. SIGNATURES
    doc.moveDown(4);
    
    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#000000').stroke();
    doc.moveDown(1);
    
    doc.fontSize(10).text(`Fait à Abidjan, le ${new Date().toLocaleDateString("fr-FR", {dateStyle: 'long'})}.`, { align: 'center' });
    doc.moveDown(2);

    const signY = doc.y;

    // Zone Bailleur
    doc.font('Times-Bold').text("POUR LE BAILLEUR", 70, signY);
    doc.rect(70, signY + 15, 200, 60).stroke();
    doc.font('Times-Italic').fontSize(8).fillColor('#999').text("(Signature en attente)", 110, signY + 40);

    // Zone Preneur
    doc.fillColor('#000000').font('Times-Bold').fontSize(10).text("POUR LE PRENEUR", 340, signY);
    doc.rect(340, signY + 15, 200, 60).stroke();

    // Tampon de signature numérique
    if (lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED') {
        doc.fillColor('green').fontSize(10).text("SIGNÉ NUMÉRIQUEMENT", 360, signY + 35);
        doc.fillColor('black').fontSize(7).font('Courier')
           .text(`Date : ${new Date(lease.updatedAt).toLocaleString()}`, 360, signY + 50)
           .text(`Hash : ${lease.documentHash ? lease.documentHash.substring(0, 15) + '...' : 'N/A'}`, 360, signY + 60);
    }

    doc.end();
  });
}
