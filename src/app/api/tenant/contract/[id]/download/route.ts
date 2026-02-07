import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma"; // Singleton

// Import compatible Next.js pour le moteur PDF serveur
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leaseId: string }> } // ✅ Correction Next.js 15
) {
  try {
    const { leaseId } = await params;

    // 1. SÉCURITÉ : Qui demande le fichier ?
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });

    // 2. RÉCUPÉRATION SÉCURISÉE
    // On vérifie que le demandeur est SOIT le locataire, SOIT le propriétaire
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true 
      },
    });

    if (!lease) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    // Vérification des droits d'accès
    const isOwner = lease.property.owner.email === user.email;
    const isTenant = lease.tenant.email === user.email;
    const isAdmin = user.role === 'SUPER_ADMIN';

    if (!isOwner && !isTenant && !isAdmin) {
        return NextResponse.json({ error: "Vous n'avez pas accès à ce contrat." }, { status: 403 });
    }

    // 3. GÉNÉRATION DU PDF (Buffer)
    const pdfBuffer = await generateLeasePDF(lease);

    // 4. RETOUR DU FICHIER
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_Certifie_${lease.property.title.substring(0, 10)}_${lease.tenant.name}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération du PDF" }, { status: 500 });
  }
}

// --- MOTEUR PDF (Votre version optimisée) ---
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // A4 Largeur = 595pt. Marges = 50pt. Largeur utilisable = 495pt.
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- 1. EN-TÊTE ---
    doc.font('Times-Bold').fontSize(22).fillColor('#111827')
       .text("CONTRAT DE BAIL RÉSIDENTIEL", { align: 'center' });
    
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
    const colWidth = 240; 
    const margin = 50; 

    // Boite Bailleur (Gauche)
    doc.roundedRect(margin, startY, colWidth, boxHeight, 5).fillColor('#f9fafb').fill();
    doc.roundedRect(margin, startY, colWidth, boxHeight, 5).strokeColor('#e5e7eb').stroke();

    doc.fillColor('#6b7280').fontSize(8).font('Times-Bold')
       .text("DÉSIGNATION DU BAILLEUR", margin + 15, startY + 15);
    
    doc.fillColor('#111827').fontSize(11).font('Times-Bold')
       .text((lease.property.owner.name || "N/A").toUpperCase(), margin + 15, startY + 30, { width: 210 });
    
    doc.fillColor('#374151').fontSize(9).font('Times-Roman')
       .text(`Email : ${lease.property.owner.email}`, margin + 15, startY + 50, { width: 210 })
       .text(`Tél : ${lease.property.owner.phone || 'Non renseigné'}`, margin + 15, startY + 65, { width: 210 });

    // Boite Preneur (Droite)
    const rightX = margin + colWidth + 15; 
    doc.roundedRect(rightX, startY, colWidth, boxHeight, 5).fillColor('#f9fafb').fill();
    doc.roundedRect(rightX, startY, colWidth, boxHeight, 5).strokeColor('#e5e7eb').stroke();

    doc.fillColor('#6b7280').fontSize(8).font('Times-Bold')
       .text("DÉSIGNATION DU PRENEUR", rightX + 15, startY + 15);
    
    doc.fillColor('#111827').fontSize(11).font('Times-Bold')
       .text((lease.tenant.name || "N/A").toUpperCase(), rightX + 15, startY + 30, { width: 210 });
    
    doc.fillColor('#374151').fontSize(9).font('Times-Roman')
       .text(`Email : ${lease.tenant.email}`, rightX + 15, startY + 50, { width: 210 })
       .text(`Tél : ${lease.tenant.phone || 'Non renseigné'}`, rightX + 15, startY + 65, { width: 210 });

    doc.y = startY + boxHeight + 30;

    // --- 3. CORPS DU CONTRAT ---
    const addArticle = (title: string, content: string) => {
        doc.font('Times-Bold').fontSize(11).fillColor('#111827')
           .text(title, { align: 'center', underline: true });
        doc.moveDown(0.5);
        doc.font('Times-Roman').fontSize(11).fillColor('#374151')
           .text(content, { align: 'justify', width: 495, lineGap: 2 });
        doc.moveDown(1.5);
    };

    addArticle("ARTICLE 1 : OBJET DU CONTRAT", 
        `Le Bailleur donne en location au Preneur les locaux situés à : ${lease.property.address}, ${lease.property.commune}. Le bien est désigné comme suit : ${lease.property.title}.`
    );

    addArticle("ARTICLE 2 : DURÉE", 
        `Le présent bail est consenti pour une durée d'un (1) an renouvelable par tacite reconduction, prenant effet le ${new Date(lease.startDate).toLocaleDateString("fr-FR")}.`
    );

    addArticle("ARTICLE 3 : LOYER ET CHARGES", 
        `Le loyer mensuel est fixé à la somme de ${(lease.monthlyRent || 0).toLocaleString()} FCFA, payable d'avance. Le dépôt de garantie est fixé à ${(lease.depositAmount || 0).toLocaleString()} FCFA.`
    );

    addArticle("ARTICLE 4 : OBLIGATIONS", 
        "Le Preneur s'engage à payer le loyer, à user paisiblement des lieux, et à répondre des dégradations. Le Bailleur s'engage à fournir un logement décent."
    );

    // --- 4. SIGNATURES ---
    doc.moveDown(2);
    const signY = doc.y;
    doc.moveTo(50, signY).lineTo(545, signY).lineWidth(1).strokeColor('#1f2937').stroke();
    doc.moveDown(1);
    
    doc.fontSize(10).font('Times-Italic')
       .text(`Fait à Abidjan, le ${new Date().toLocaleDateString("fr-FR")}.`, { align: 'center' });
    doc.moveDown(2);

    const boxSignY = doc.y;
    const signBoxHeight = 90;

    // -- ZONE BAILLEUR --
    doc.font('Times-Bold').fontSize(9).fillColor('#6b7280').text("POUR LE BAILLEUR", 50, boxSignY);
    doc.roundedRect(50, boxSignY + 15, 240, signBoxHeight, 4).strokeColor('#d1d5db').stroke();
    
    // On simule une signature si le contrat est actif
    if (lease.status === 'ACTIVE') {
         doc.fillColor('#059669').fontSize(10).text("SIGNÉ NUMÉRIQUEMENT", 50, boxSignY + 40, { width: 240, align: 'center' });
    } else {
         doc.font('Times-Italic').fontSize(8).fillColor('#9ca3af')
            .text("(Signature en attente)", 50, boxSignY + 55, { width: 240, align: 'center' });
    }

    // -- ZONE PRENEUR --
    doc.font('Times-Bold').fontSize(9).fillColor('#6b7280').text("POUR LE PRENEUR", 305, boxSignY);
    
    const isSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';

    if (isSigned) {
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).fillColor('#ecfdf5').fill();
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).lineWidth(1).strokeColor('#059669').stroke();

        doc.fillColor('#047857').fontSize(10).font('Times-Bold')
           .text("SIGNÉ NUMÉRIQUEMENT", 305, boxSignY + 35, { width: 240, align: 'center' });
        
        doc.fillColor('#065f46').fontSize(9).font('Times-Bold')
           .text((lease.tenant.name || "").toUpperCase(), 305, boxSignY + 50, { width: 240, align: 'center' });

        doc.fillColor('#064e3b').fontSize(8).font('Times-Roman')
           .text(`Date : ${new Date(lease.updatedAt).toLocaleString()}`, 305, boxSignY + 65, { width: 240, align: 'center' });
        
        const displayHash = lease.documentHash || "Hash généré...";
        doc.fillColor('#064e3b').fontSize(5).font('Courier')
           .text(`ID: ${displayHash.substring(0, 30)}...`, 305, boxSignY + 80, { width: 240, align: 'center' });

    } else {
        doc.roundedRect(305, boxSignY + 15, 240, signBoxHeight, 4).dash(4, {space: 2}).strokeColor('#9ca3af').stroke();
        doc.undash();
        doc.font('Times-Italic').fontSize(8).fillColor('#9ca3af')
           .text("(En attente de signature)", 305, boxSignY + 55, { width: 240, align: 'center' });
    }

    // --- FOOTER ---
    doc.fontSize(7).fillColor('#9ca3af').font('Times-Roman')
       .text(
           `Ce document est certifié par la plateforme ImmoFacile - ID: ${lease.id} - Page 1/1`, 
           50, 
           doc.page.height - 30, 
           { align: 'center', width: 495 }
       );

    doc.end();
  });
}
