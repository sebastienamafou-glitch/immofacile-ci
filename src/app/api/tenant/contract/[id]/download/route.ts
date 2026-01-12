import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    const pdfBuffer = await generateLeasePDF(lease);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_Certifie_${lease.id.substring(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // A4 Largeur = 595pt.
    // Marges = 50pt gauche, 50pt droite.
    // Largeur utilisable = 495pt.
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- 1. EN-TÊTE ---
    doc.font('Times-Bold').fontSize(22).fillColor('#111827')
       .text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    
    doc.moveDown(0.5);
    doc.font('Times-Italic').fontSize(10).fillColor('#6b7280')
       .text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019", { align: 'center' });

    doc.moveDown(0.5);
    doc.font('Courier').fontSize(9).fillColor('#374151')
       .text(`Réf Unique : ${lease.id}`, { align: 'center' });

    doc.moveDown(2);

    // --- 2. LES PARTIES (Centrées) ---
    const startY = doc.y;
    const boxHeight = 100;
    // Calcul pour centrer les deux boites :
    // Espace total 495. Gap 15. Largeur boite = (495 - 15) / 2 = 240.
    const colWidth = 240; 
    const margin = 50; 

    // Boite Bailleur (Gauche)
    doc.roundedRect(margin, startY, colWidth, boxHeight, 5).fillColor('#f9fafb').fill();
    doc.roundedRect(margin, startY, colWidth, boxHeight, 5).strokeColor('#e5e7eb').stroke();

    doc.fillColor('#6b7280').fontSize(8).font('Times-Bold')
       .text("DÉSIGNATION DU BAILLEUR", margin + 15, startY + 15);
    
    doc.fillColor('#111827').fontSize(11).font('Times-Bold')
       .text(lease.property.owner.name.toUpperCase(), margin + 15, startY + 30, { width: 210 });
    
    doc.fillColor('#374151').fontSize(9).font('Times-Roman')
       .text(`Email : ${lease.property.owner.email}`, margin + 15, startY + 50, { width: 210 })
       .text(`Tél : ${lease.property.owner.phone || 'Non renseigné'}`, margin + 15, startY + 65, { width: 210 });

    // Boite Preneur (Droite)
    const rightX = margin + colWidth + 15; // 50 + 240 + 15 = 305
    doc.roundedRect(rightX, startY, colWidth, boxHeight, 5).fillColor('#f9fafb').fill();
    doc.roundedRect(rightX, startY, colWidth, boxHeight, 5).strokeColor('#e5e7eb').stroke();

    doc.fillColor('#6b7280').fontSize(8).font('Times-Bold')
       .text("DÉSIGNATION DU PRENEUR", rightX + 15, startY + 15);
    
    doc.fillColor('#111827').fontSize(11).font('Times-Bold')
       .text(lease.tenant.name.toUpperCase(), rightX + 15, startY + 30, { width: 210 });
    
    doc.fillColor('#374151').fontSize(9).font('Times-Roman')
       .text(`Email : ${lease.tenant.email}`, rightX + 15, startY + 50, { width: 210 })
       .text(`Tél : ${lease.tenant.phone || 'Non renseigné'}`, rightX + 15, startY + 65, { width: 210 });

    doc.y = startY + boxHeight + 30;

    // --- 3. CORPS DU CONTRAT (Centré et Justifié) ---
    const addArticle = (title: string, content: string) => {
        // Titre Centré
        doc.font('Times-Bold').fontSize(11).fillColor('#111827')
           .text(title, { align: 'center', underline: true });
        
        doc.moveDown(0.5);
        
        // Contenu Justifié avec largeur stricte (495) pour ne pas dépasser
        doc.font('Times-Roman').fontSize(11).fillColor('#374151')
           .text(content, { 
               align: 'justify', 
               width: 495,       // Largeur exacte page (595) - marges (100)
               lineGap: 2 
           });
           
        doc.moveDown(1.5);
    };

    addArticle("ARTICLE 1 : OBJET DU CONTRAT", 
        `Le Bailleur donne en location au Preneur les locaux situés à : ${lease.property.address}, ${lease.property.commune}. Le bien est désigné comme suit : ${lease.property.title}.`
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

    // --- 4. SIGNATURES ---
    doc.moveDown(2);
    const signY = doc.y;

    // Ligne de séparation
    doc.moveTo(50, signY).lineTo(545, signY).lineWidth(1).strokeColor('#1f2937').stroke();
    doc.moveDown(1);
    
    doc.fontSize(10).font('Times-Italic')
       .text(`Fait à Abidjan, le ${new Date().toLocaleDateString("fr-FR", {dateStyle: 'long'})}.`, { align: 'center' });
    doc.moveDown(2);

    const boxSignY = doc.y;
    const signBoxHeight = 90;

    // -- ZONE BAILLEUR --
    doc.font('Times-Bold').fontSize(9).fillColor('#6b7280').text("POUR LE BAILLEUR", 50, boxSignY);
    // Cadre vide (en attente)
    doc.roundedRect(50, boxSignY + 15, 240, signBoxHeight, 4).strokeColor('#d1d5db').stroke();

    if (lease.signatureStatus === 'COMPLETED') {
         // Signature Propriétaire
         doc.save();
         doc.rect(51, boxSignY + 16, 238, signBoxHeight - 2).fillColor('#ecfdf5').fill();
         doc.restore();
         doc.fillColor('#059669').fontSize(10).text("SIGNÉ NUMÉRIQUEMENT", 50, boxSignY + 40, { width: 240, align: 'center' });
         doc.fillColor('#000000').fontSize(7).text(new Date().toLocaleDateString(), 50, boxSignY + 55, { width: 240, align: 'center' });
    } else {
         doc.font('Times-Italic').fontSize(8).fillColor('#9ca3af')
            .text("(Signature en attente)", 50, boxSignY + 55, { width: 240, align: 'center' });
    }

    // -- ZONE PRENEUR --
    doc.font('Times-Bold').fontSize(9).fillColor('#6b7280').text("POUR LE PRENEUR", 305, boxSignY);
    
    const isSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';

    if (isSigned) {
        // Fond Vert
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).fillColor('#ecfdf5').fill();
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).lineWidth(1).strokeColor('#059669').stroke();

        doc.fillColor('#047857').fontSize(10).font('Times-Bold')
           .text("SIGNÉ NUMÉRIQUEMENT", 305, boxSignY + 35, { width: 240, align: 'center' });
        
        doc.fillColor('#065f46').fontSize(9).font('Times-Bold')
           .text(lease.tenant.name.toUpperCase(), 305, boxSignY + 50, { width: 240, align: 'center' });

        doc.fillColor('#064e3b').fontSize(8).font('Times-Roman')
           .text(`Date : ${new Date(lease.updatedAt).toLocaleString()}`, 305, boxSignY + 65, { width: 240, align: 'center' });
        
        // Petit Hash
        const displayHash = lease.documentHash || "Hash généré...";
        doc.fillColor('#064e3b').fontSize(5).font('Courier')
           .text(`ID: ${displayHash.substring(0, 30)}...`, 305, boxSignY + 80, { width: 240, align: 'center' });

    } else {
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).dash(4, {space: 2}).strokeColor('#9ca3af').stroke();
        doc.undash();
        doc.font('Times-Italic').fontSize(8).fillColor('#9ca3af')
           .text("(En attente de signature)", 305, boxSignY + 55, { width: 240, align: 'center' });
    }

    // --- FOOTER ABSOLU ---
    doc.fontSize(7).fillColor('#9ca3af').font('Times-Roman')
       .text(
           `Ce document est certifié par la plateforme ImmoFacile - ID: ${lease.id} - Page 1/1`, 
           50, 
           doc.page.height - 30, // Position basse fixe
           { align: 'center', width: 495 }
       );

    doc.end();
  });
}
