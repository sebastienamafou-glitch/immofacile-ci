import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ✅ FIX : Version standalone pour compatibilité Edge/Serverless
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

    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true
      },
    });

    if (!lease) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    const isOwner = lease.property?.owner?.id === userId;
    const isTenant = lease.tenant?.id === userId;
    if (!isOwner && !isTenant) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const pdfBuffer = await generateSinglePageLease(lease);

    const safeTitle = (lease.property?.title || "Bail").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Bail_${safeTitle}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- UTILITAIRES ---
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', { style: 'decimal' }).format(amount).replace(/,/g, ' ');
};

const formatDate = (date: Date | string | null) => {
    if (!date) return "....................";
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- MOTEUR PDF ---
function generateSinglePageLease(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    
    // 1. MARGES ASYMÉTRIQUES (CRUCIAL POUR EVITER LA PAGE 2)
    // On met bottom à 10 pour que le footer (qui est à 20 du bas) ne soit pas considéré comme "hors limite"
    const MARGIN = 25; 
    const doc = new PDFDocument({ 
        margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: 10 }, 
        size: 'A4' 
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Largeur utile (basée sur les marges latérales)
    const width = doc.page.width - (MARGIN * 2);
    
    const COLORS = {
        title: '#000000',
        subtitle: '#555555',
        boxBg: '#F8FAFC',
        boxBorder: '#E2E8F0',
        headerText: '#475569',
        bodyText: '#1e293b',
        accent: '#16a34a' 
    };

    // --- EN-TÊTE COMPACT ---
    let y = MARGIN;

    doc.font('Times-Bold').fontSize(14).fillColor(COLORS.title)
       .text("CONTRAT DE BAIL À USAGE D'HABITATION", MARGIN, y, { align: 'center', width });
    
    y += 18; 

    doc.font('Times-Italic').fontSize(8).fillColor(COLORS.subtitle)
       .text("Régis par la Loi n° 2019-576 du 26 juin 2019 (Code de la Construction)", MARGIN, y, { align: 'center', width });
    
    y += 12;
    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1).strokeColor('#000000').stroke();
    y += 10; 

    // --- LES PARTIES (BOX HAUTEUR 55) ---
    const boxHeight = 55;
    const boxWidth = (width / 2) - 8;
    const rightBoxX = MARGIN + boxWidth + 16;

    doc.save();
    doc.roundedRect(MARGIN, y, boxWidth, boxHeight, 3).fillColor(COLORS.boxBg).fill();
    doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 3).fillColor(COLORS.boxBg).fill();
    doc.roundedRect(MARGIN, y, boxWidth, boxHeight, 3).lineWidth(0.5).strokeColor(COLORS.boxBorder).stroke();
    doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 3).lineWidth(0.5).strokeColor(COLORS.boxBorder).stroke();
    doc.restore();

    // Contenu Bailleur
    const textPadding = 8;
    let localY = y + textPadding;
    
    doc.font('Times-Bold').fontSize(6).fillColor(COLORS.headerText)
       .text("LE BAILLEUR", MARGIN + textPadding, localY);
    
    doc.font('Times-Bold').fontSize(9).fillColor(COLORS.title)
       .text((lease.property?.owner?.name || "NOM PROPRIÉTAIRE").substring(0, 35).toUpperCase(), MARGIN + textPadding, localY + 9);
    
    doc.font('Times-Roman').fontSize(7.5).fillColor(COLORS.bodyText)
       .text(`${lease.property?.owner?.phone || "Tél: N/A"}`, MARGIN + textPadding, localY + 22)
       .text(`${lease.property?.owner?.email || ""}`, MARGIN + textPadding, localY + 32);

    // Contenu Preneur
    localY = y + textPadding;
    doc.font('Times-Bold').fontSize(6).fillColor(COLORS.headerText)
       .text("LE PRENEUR", rightBoxX + textPadding, localY);
    
    doc.font('Times-Bold').fontSize(9).fillColor(COLORS.title)
       .text((lease.tenant?.name || "NOM LOCATAIRE").substring(0, 35).toUpperCase(), rightBoxX + textPadding, localY + 9);
    
    doc.font('Times-Roman').fontSize(7.5).fillColor(COLORS.bodyText)
       .text(`${lease.tenant?.phone || "Tél: N/A"}`, rightBoxX + textPadding, localY + 22)
       .text(`${lease.tenant?.email || ""}`, rightBoxX + textPadding, localY + 32);

    y += boxHeight + 10;

    // --- ARTICLES (MODE COMPACT) ---
    
    const drawArticle = (title: string, content: string) => {
        doc.font('Times-Bold').fontSize(8.5).fillColor('#000000')
           .text(title, MARGIN, y); 
        
        y = doc.y + 2; 

        doc.font('Times-Roman').fontSize(8).fillColor('#333333')
           .text(content, MARGIN, y, { align: 'justify', width: width, lineGap: 0 }); 
        
        y = doc.y + 5; 
    };

    drawArticle("1. OBJET", 
        `Location à usage d'habitation sise à ${lease.property?.address}, ${lease.property?.commune}. Le Preneur accepte les lieux en l'état.`
    );

    drawArticle("2. DURÉE", 
        `1 an ferme du ${formatDate(lease.startDate)}, renouvelable par tacite reconduction. Préavis: 3 mois.`
    );

    // Article 3 : Finances compact
    doc.font('Times-Bold').fontSize(8.5).fillColor('#000000').text("3. CONDITIONS FINANCIÈRES", MARGIN, y);
    y = doc.y + 2;
    
    doc.rect(MARGIN, y, width, 32).fillColor('#F1F5F9').fill();
    
    const fy = y + 5;
    const fx = MARGIN + 10;
    
    doc.font('Times-Bold').fontSize(8).fillColor('#000000');
    doc.text(`LOYER : ${formatMoney(lease.monthlyRent)} FCFA / mois`, fx, fy);
    doc.text(`CAUTION : ${formatMoney(lease.depositAmount)} FCFA`, fx + 200, fy);
    
    doc.font('Times-Italic').fontSize(7.5).fillColor('#555555')
       .text("Payable d'avance le 05 du mois. Révision triennale légale.", fx, fy + 12);
    
    y += 38;

    // Articles Juridiques Condensés
    drawArticle("4. OBLIGATIONS & TRAVAUX", 
        `Usage en "bon père de famille". Aucune transformation sans accord écrit. Menues réparations à charge du locataire. Grosses réparations (clos/couvert) à charge du bailleur.`
    );

    drawArticle("5. INTERDICTION DE SOUS-LOUER", 
        `Sous-location (totale/partielle) et cession rigoureusement interdites sans accord écrit, sous peine de résiliation.`
    );

    drawArticle("6. VISITE DES LIEUX", 
        `Droit de visite du Bailleur pour vérification d'état ou relocation, sur rendez-vous, aux heures légales.`
    );

    drawArticle("7. CLAUSE RÉSOLUTOIRE & LITIGES", 
        `Résiliation de plein droit 1 mois après commandement de payer infructueux. Compétence exclusive : Tribunaux d'Abidjan.`
    );

    // --- SIGNATURES ---
    
    let sigY = y + 15; 
    
    doc.moveTo(MARGIN, sigY).lineTo(doc.page.width - MARGIN, sigY).lineWidth(0.5).strokeColor('#ccc').stroke();
    sigY += 10;

    doc.font('Times-Italic').fontSize(8).fillColor('#000000')
       .text(`Fait à Abidjan, le ${formatDate(new Date())}.`, MARGIN, sigY, { align: 'right' });
    
    sigY += 12;

    const sigHeight = 65;

    // Cadres
    doc.rect(MARGIN, sigY, boxWidth, sigHeight).strokeColor(COLORS.boxBorder).stroke();
    doc.rect(rightBoxX, sigY, boxWidth, sigHeight).strokeColor(COLORS.boxBorder).stroke();

    // Titres cadres
    doc.font('Times-Bold').fontSize(7).fillColor(COLORS.headerText)
       .text("LE BAILLEUR", MARGIN + 5, sigY + 5)
       .text("LE PRENEUR", rightBoxX + 5, sigY + 5);

    // Signature Bailleur
    if (lease.signatureStatus === 'SIGNED_OWNER' || lease.signatureStatus === 'COMPLETED') {
        doc.font('Times-Bold').fontSize(9).fillColor(COLORS.accent)
           .text("SIGNÉ", MARGIN, sigY + 25, { align: 'center', width: boxWidth });
        doc.font('Times-Roman').fontSize(7).fillColor('#000000')
           .text(lease.property?.owner?.name?.toUpperCase(), MARGIN, sigY + 40, { align: 'center', width: boxWidth });
    }

    // Signature Preneur
    if (lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED') {
        doc.rect(rightBoxX, sigY, boxWidth, sigHeight).lineWidth(1).strokeColor(COLORS.accent).stroke();
        
        doc.font('Times-Bold').fontSize(9).fillColor(COLORS.accent)
           .text("✔ SIGNÉ NUMÉRIQUEMENT", rightBoxX, sigY + 25, { align: 'center', width: boxWidth });
        
        doc.font('Times-Roman').fontSize(7).fillColor('#000000')
           .text(lease.tenant?.name?.toUpperCase(), rightBoxX, sigY + 38, { align: 'center', width: boxWidth });
        
        const sig = lease.signatures?.[0];
        if (sig) {
            doc.fontSize(5).font('Courier').fillColor('#888')
               .text(`ID: ${sig.id}`, rightBoxX, sigY + 50, { align: 'center', width: boxWidth })
               .text(`${new Date(sig.signedAt).toLocaleString()}`, rightBoxX, sigY + 56, { align: 'center', width: boxWidth });
        }
    }

    // --- FOOTER SANS PAGE BREAK ---
    // On remonte légèrement le footer à -30 pour être sûr d'être dans la zone "bottom: 10" autorisée.
    doc.fontSize(6).fillColor('#cbd5e1').font('Times-Roman')
       .text(
           `Titre exécutoire certifié par ImmoFacile - Ref: ${lease.id} - Page 1/1`, 
           MARGIN, 
           doc.page.height - 30, 
           { align: 'center', width }
       );

    doc.end();
  });
}
