import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ✅ Type de données généré automatiquement par Prisma
// Si tu changes ton schema.prisma, ce type se mettra à jour ou signalera une erreur ici.
type LeaseWithDetails = Prisma.LeaseGetPayload<{
  include: {
    property: {
      include: { owner: true } // On récupère le propriétaire via la propriété
    };
    tenant: true;             // On récupère le locataire
    signatures: true;         // On récupère les preuves de signature
  }
}>;

// Version standalone pour compatibilité Edge/Serverless (Vercel)
// On utilise require ici car l'import ES6 de pdfkit peut poser problème en serverless
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 1. Récupération typée
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true
      },
    });

    if (!lease) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    // 2. Vérification des droits (Sécurité)
    const isOwner = lease.property.owner.id === userId;
    const isTenant = lease.tenant.id === userId;
    
    // On autorise uniquement le propriétaire ou le locataire
    if (!isOwner && !isTenant) {
        return NextResponse.json({ error: "Accès refusé au document." }, { status: 403 });
    }

    // 3. Génération du PDF
    const pdfBuffer = await generateSinglePageLease(lease);

    // Nettoyage du titre pour le nom de fichier
    const safeTitle = (lease.property.title || "Bail").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Bail_${safeTitle}.pdf"`,
  },
});

  } catch (error: unknown) {
    console.error("Erreur Génération PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération du bail" }, { status: 500 });
  }
}

// --- UTILITAIRES DE FORMATAGE ---
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', { style: 'decimal' }).format(amount).replace(/,/g, ' ');
};

const formatDate = (date: Date | string | null) => {
    if (!date) return "....................";
    // Force UTC pour éviter les décalages horaires (ex: 23h le jour d'avant)
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// --- MOTEUR PDF ---
function generateSinglePageLease(lease: LeaseWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    
    const MARGIN = 30;
    const doc = new PDFDocument({ 
        margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: 20 }, 
        size: 'A4',
        bufferPages: true 
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - (MARGIN * 2);
    
    const COLORS = {
        title: '#0F172A',     // Slate-900
        subtitle: '#64748B',  // Slate-500
        boxBg: '#F8FAFC',     // Slate-50
        boxBorder: '#E2E8F0', // Slate-200
        accent: '#EA580C'     // Orange-600
    };

    // --- EN-TÊTE ---
    doc.font('Times-Bold').fontSize(16).fillColor(COLORS.title)
       .text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    
    doc.moveDown(0.5);

    doc.font('Times-Italic').fontSize(9).fillColor(COLORS.subtitle)
       .text("Régis par la Loi n° 2019-576 du 26 juin 2019 (Code de la Construction)", { align: 'center' });
    
    doc.moveDown(0.5);
    
    const currentY = doc.y;
    doc.moveTo(MARGIN, currentY).lineTo(doc.page.width - MARGIN, currentY).lineWidth(1).strokeColor(COLORS.title).stroke();
    
    doc.moveDown(1);

    // --- LES PARTIES ---
    const startY = doc.y;
    const boxWidth = (width / 2) - 10;
    const boxHeight = 65;
    const rightBoxX = MARGIN + boxWidth + 20;

    const drawPartyBox = (x: number, title: string, name: string | null, phone: string | null, email: string | null) => {
        doc.roundedRect(x, startY, boxWidth, boxHeight, 4).fillColor(COLORS.boxBg).fill();
        doc.roundedRect(x, startY, boxWidth, boxHeight, 4).lineWidth(0.5).strokeColor(COLORS.boxBorder).stroke();
        
        const pad = 10;
        let textY = startY + pad;
        
        doc.font('Times-Bold').fontSize(7).fillColor(COLORS.subtitle).text(title, x + pad, textY);
        
        textY += 10;
        // Gestion des valeurs nulles (conformité schéma User)
        const safeName = (name ?? "Non renseigné").toUpperCase().substring(0, 30);
        doc.font('Times-Bold').fontSize(10).fillColor(COLORS.title).text(safeName, x + pad, textY);
        
        textY += 14;
        doc.font('Times-Roman').fontSize(8).fillColor('#334155')
           .text(`Tél: ${phone ?? "Non renseigné"}`, x + pad, textY);
        
        textY += 10;
        doc.text(`Email: ${email ?? "Non renseigné"}`, x + pad, textY);
    };

    // Appel avec les données typées du schéma
    drawPartyBox(MARGIN, "LE BAILLEUR", lease.property.owner.name, lease.property.owner.phone, lease.property.owner.email);
    drawPartyBox(rightBoxX, "LE PRENEUR", lease.tenant.name, lease.tenant.phone, lease.tenant.email);

    doc.y = startY + boxHeight + 20;

    // --- ARTICLES ---
    const drawArticle = (title: string, content: string) => {
        doc.font('Times-Bold').fontSize(9).fillColor('#000000').text(title);
        doc.moveDown(0.3);
        doc.font('Times-Roman').fontSize(9).fillColor('#333333').text(content, { align: 'justify', width: width });
        doc.moveDown(0.8);
    };

    drawArticle("1. OBJET ET DÉSIGNATION", 
        `Le Bailleur donne en location au Preneur les locaux sis à : ${lease.property.address}, ${lease.property.commune}. Le bien est accepté en l'état.`
    );

    drawArticle("2. DURÉE DU CONTRAT", 
        `Le bail est consenti pour une durée d'un (1) an ferme commençant le ${formatDate(lease.startDate)}, renouvelable par tacite reconduction. Le préavis de départ est fixé à trois (3) mois.`
    );

    // Cadre Financier
    doc.font('Times-Bold').fontSize(9).fillColor('#000000').text("3. CONDITIONS FINANCIÈRES");
    doc.moveDown(0.3);
    
    const financeY = doc.y;
    doc.rect(MARGIN, financeY, width, 30).fillColor('#F1F5F9').fill();
    
    const textFinanceY = financeY + 10;
    doc.font('Times-Bold').fontSize(9).fillColor('#000000');
    // Utilisation des champs Int du schema Lease (monthlyRent, depositAmount)
    doc.text(`LOYER MENSUEL : ${formatMoney(lease.monthlyRent)} FCFA`, MARGIN + 10, textFinanceY, { continued: true });
    doc.text(`        CAUTION : ${formatMoney(lease.depositAmount)} FCFA`, { continued: false });

    doc.y = financeY + 45;

    drawArticle("4. OBLIGATIONS ET ENTRETIEN", 
        `Le Preneur s'oblige à user des lieux en "bon père de famille". Il prend à sa charge l'entretien courant et les menues réparations locatives.`
    );

    drawArticle("5. CLAUSE RÉSOLUTOIRE", 
        `À défaut de paiement d'un seul terme de loyer à son échéance, le présent bail sera résilié de plein droit un mois après un commandement de payer resté infructueux.`
    );

    // --- SIGNATURES ---
    doc.moveDown(1.5);
    const sigLineY = doc.y;
    doc.moveTo(MARGIN, sigLineY).lineTo(doc.page.width - MARGIN, sigLineY).lineWidth(0.5).strokeColor('#CBD5E1').stroke();
    
    doc.moveDown(1);
    doc.font('Times-Italic').fontSize(9).fillColor('#000000')
       .text(`Fait à Abidjan, en deux exemplaires originaux, le ${formatDate(new Date())}.`, { align: 'right' });

    doc.moveDown(1);
    const sigBoxY = doc.y;

    doc.font('Times-Bold').fontSize(8).fillColor(COLORS.subtitle)
       .text("POUR LE BAILLEUR", MARGIN, sigBoxY)
       .text("POUR LE PRENEUR", rightBoxX, sigBoxY);

    const drawStamp = (x: number, y: number, name: string | null, isDigital: boolean, date?: Date) => {
        const stampY = y + 15;
        doc.roundedRect(x, stampY, boxWidth, 50, 4).lineWidth(1)
           .strokeColor(isDigital ? COLORS.accent : '#CBD5E1').dash(isDigital ? 0 : 3, { space: 3 }).stroke();
        doc.undash();

        if (isDigital) {
            doc.font('Times-Bold').fontSize(10).fillColor(COLORS.accent)
               .text("SIGNE NUMERIQUEMENT", x, stampY + 15, { width: boxWidth, align: 'center' });
            
            doc.font('Times-Roman').fontSize(7).fillColor('#000000')
               .text(`Par : ${(name ?? "Inconnu").toUpperCase()}`, x, stampY + 30, { width: boxWidth, align: 'center' });
            
            if (date) {
               doc.text(`${formatDate(date)}`, x, stampY + 38, { width: boxWidth, align: 'center' });
            }
        } else {
             doc.font('Times-Italic').fontSize(8).fillColor('#94A3B8')
               .text("(En attente de signature)", x, stampY + 20, { width: boxWidth, align: 'center' });
        }
    };

    // Vérification des statuts basée sur l'Enum du schéma (SignatureStatus)
    const isOwnerSigned = lease.signatureStatus === 'SIGNED_OWNER' || lease.signatureStatus === 'COMPLETED';
    const isTenantSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';
    const sigData = lease.signatures?.[0];

    drawStamp(MARGIN, sigBoxY, lease.property.owner.name, isOwnerSigned);
    drawStamp(rightBoxX, sigBoxY, lease.tenant.name, isTenantSigned, sigData?.signedAt);

    // --- FOOTER ---
    const bottomPage = doc.page.height - 30;
    doc.fontSize(7).fillColor('#94A3B8').font('Times-Roman')
       .text(
           `Document généré par ImmoFacile.CI - Ref: ${lease.id} - Ce document vaut titre exécutoire.`, 
           MARGIN, 
           bottomPage, 
           { align: 'center', width }
       );

    doc.end();
  });
}
