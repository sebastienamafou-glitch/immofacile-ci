import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ✅ Type de données enrichi (Identique au Propriétaire)
type LeaseWithDetails = Prisma.LeaseGetPayload<{
  include: {
    property: {
      include: { owner: true }
    };
    tenant: true;
    signatures: true; 
  }
}>;

// Version standalone pour compatibilité Vercel / Edge
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

    // 1. Récupération des données (Identique au Propriétaire)
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true
      },
    });

    if (!lease) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    // 2. Sécurité : Vérification des droits d'accès (Spécifique Locataire)
    // On s'assure que c'est bien le locataire du bail qui demande le PDF
    const isTenant = lease.tenant.id === userId;
    
    // On peut aussi autoriser les admins
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true }});
    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

    if (!isTenant && !isAdmin) {
        return NextResponse.json({ error: "Accès refusé. Vous n'êtes pas le locataire de ce bail." }, { status: 403 });
    }

    // 3. Génération du PDF "Bank-Grade" (Même moteur que Owner)
    const pdfBuffer = await generateFullLegalLease(lease);

    const safeTitle = (lease.property.title || "Bail").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Mon_Bail_Signe_${safeTitle}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("Erreur Génération PDF Locataire:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
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

const formatDateTime = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString('fr-FR', { 
        day: 'numeric', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
};

// --- MOTEUR DE GÉNÉRATION COMPLET (Copie exacte de la version Owner) ---
function generateFullLegalLease(lease: LeaseWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    
    const MARGIN = 40; 
    const doc = new PDFDocument({ 
        margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: MARGIN }, 
        size: 'A4',
        bufferPages: true 
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = doc.page.width - (MARGIN * 2);
    
    // --- EN-TÊTE JURIDIQUE ---
    doc.font('Times-Bold').fontSize(16).text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Times-Italic').fontSize(10).text("Soumis aux dispositions impératives de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.", { align: 'center' });
    
    doc.moveDown(0.5);
    const yLine = doc.y;
    doc.moveTo(MARGIN, yLine).lineTo(doc.page.width - MARGIN, yLine).stroke();
    doc.moveDown(1);

    // --- IDENTIFICATION DES PARTIES ---
    doc.font('Times-Bold').fontSize(11).text("ENTRE LES SOUSSIGNÉS :", { underline: true });
    doc.moveDown(0.5);

    // BAILLEUR
    doc.font('Times-Bold').text("LE BAILLEUR : ", { continued: true }).font('Times-Roman').text(lease.property.owner.name?.toUpperCase() || "NON RENSEIGNÉ");
    doc.text(`Contact: ${lease.property.owner.email || "Non renseigné"} / Tél: ${lease.property.owner.phone || "Non renseigné"}`);
    doc.font('Times-Italic').text("Ci-après dénommé \"Le Bailleur\".");
    
    doc.moveDown(0.5);

    // PRENEUR
    doc.font('Times-Bold').text("LE PRENEUR : ", { continued: true }).font('Times-Roman').text(lease.tenant.name?.toUpperCase() || "NON RENSEIGNÉ");
    doc.text(`Contact: ${lease.tenant.email || "Non renseigné"} / Tél: ${lease.tenant.phone || "Non renseigné"}`);
    doc.font('Times-Italic').text("Ci-après dénommé \"Le Preneur\".");

    doc.moveDown(1);
    doc.font('Times-Bold').text("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", { align: 'center' });
    doc.moveDown(1);

    // --- FONCTION D'ÉCRITURE DES ARTICLES ---
    const writeArticle = (num: number, title: string, content: string) => {
        doc.font('Times-Bold').fontSize(10).text(`ARTICLE ${num}: ${title}`);
        doc.font('Times-Roman').fontSize(10).text(content, { align: 'justify' });
        doc.moveDown(0.8);
    };

    // --- CORPS DU CONTRAT (12 Articles) ---

    writeArticle(1, "DÉSIGNATION DES LIEUX", 
        `Le Bailleur donne en location au Preneur, qui accepte, les locaux situés à : ${lease.property.address}, ${lease.property.commune}. \n` +
        `Le bien comprend : ${lease.property.bedrooms} chambre(s), ${lease.property.bathrooms} salle(s) d'eau. \n` +
        `Le Preneur déclare prendre les lieux dans l'état où ils se trouvent lors de l'entrée en jouissance.`
    );

    writeArticle(2, "DURÉE DU BAIL", 
        `Le bail est conclu pour une durée de UN (1) AN à compter du ${formatDate(lease.startDate)}. ` +
        `Il se renouvellera par tacite reconduction pour la même durée, sauf dénonciation par l'une des parties par acte extrajudiciaire ou lettre recommandée avec accusé de réception, moyennant un préavis de trois (3) mois.`
    );

    writeArticle(3, "LOYER ET DÉPÔT DE GARANTIE", 
        `Loyer mensuel : ${formatMoney(lease.monthlyRent)} FCFA payable d'avance.\n` +
        `Dépôt de garantie : ${formatMoney(lease.depositAmount)} FCFA. Cette somme ne pourra en aucun cas s'imputer sur le paiement des loyers et sera restituée au Preneur après l'état des lieux de sortie, déduction faite des sommes dues au titre des réparations locatives.`
    );

    writeArticle(4, "PAIEMENT ET PÉNALITÉS", 
        `Le loyer est exigible le 05 de chaque mois. Tout retard de paiement au-delà du 10 du mois entraînera de plein droit l'application d'une pénalité de 10% sur le montant dû, sans préjudice de l'action en résiliation.`
    );

    writeArticle(5, "OBLIGATIONS DU PRENEUR", 
        `Le Preneur s'oblige à : 1) Payer le loyer aux termes convenus. 2) User paisiblement des locaux suivant la destination bourgeoise prévue. 3) Entretenir les lieux en bon état de réparations locatives (plomberie, électricité, serrures, vitres). 4) Ne pas troubler la jouissance paisible des voisins.`
    );

    writeArticle(6, "OBLIGATIONS DU BAILLEUR", 
        `Le Bailleur est tenu de : 1) Délivrer au Preneur le logement en bon état d'usage et de réparation. 2) Assurer au Preneur la jouissance paisible du logement. 3) Entretenir les locaux en état de servir à l'usage prévu par le contrat (grosses réparations, clos et couvert).`
    );

    writeArticle(7, "TRAVAUX ET TRANSFORMATIONS", 
        `Le Preneur ne pourra faire aucuns travaux de transformation ou de perçage de gros œuvre sans l'accord écrit et préalable du Bailleur. À défaut d'accord, le Bailleur pourra exiger la remise en état des lieux aux frais du Preneur lors de son départ.`
    );

    writeArticle(8, "CESSION ET SOUS-LOCATION", 
        `Toute cession de bail ou sous-location, même partielle ou temporaire, est strictement interdite sans l'accord écrit du Bailleur. En cas de non-respect, le bail sera résilié immédiatement de plein droit.`
    );

    writeArticle(9, "DROIT DE VISITE", 
        `Le Bailleur ou son représentant pourra visiter les lieux pour vérifier leur état d'entretien, sur rendez-vous pris 48h à l'avance. En cas de mise en vente ou de relocation, le Preneur devra laisser visiter les lieux deux heures par jour les jours ouvrables.`
    );

    writeArticle(10, "CLAUSE RÉSOLUTOIRE", 
        `À défaut de paiement d'un seul terme de loyer à son échéance ou d'inexécution d'une seule des conditions du bail, et un mois après un commandement de payer ou une mise en demeure resté infructueux, le bail sera résilié de plein droit si bon semble au Bailleur.`
    );

    writeArticle(11, "ÉTAT DES LIEUX", 
        `Un état des lieux contradictoire sera établi lors de la remise des clés et lors de leur restitution. À défaut d'état des lieux de sortie, le Preneur sera présumé avoir reçu les lieux en bon état de réparations locatives.`
    );

    writeArticle(12, "ÉLECTION DE DOMICILE ET LITIGES", 
        `Pour l'exécution des présentes, les parties font élection de domicile en leurs demeures respectives. En cas de litige, compétence est attribuée aux tribunaux du lieu de situation de l'immeuble.`
    );

    doc.moveDown(1);

    // --- ZONE DE SIGNATURE SÉCURISÉE ---
    
    if (doc.y > doc.page.height - 150) doc.addPage();

    const signY = doc.y;
    
    // Titres
    doc.font('Times-Bold').fontSize(10).text("LE BAILLEUR", MARGIN, signY);
    doc.text("LE PRENEUR (LU ET APPROUVÉ)", 300, signY);

    // Recherche signature
    const tenantSignature = lease.signatures.find(s => s.signerId === lease.tenant.id) || lease.signatures[0];
    const isSigned = !!tenantSignature;

    // Dessin du cadre de signature "PRENEUR"
    const boxX = 300;
    const boxY = signY + 15;
    const boxW = 200;
    const boxH = 80;

    doc.rect(boxX, boxY, boxW, boxH).strokeColor(isSigned ? '#16A34A' : '#CBD5E1').lineWidth(1).stroke();

    if (isSigned) {
        const textX = boxX + 10;
        let textY = boxY + 10;

        doc.fillColor('#16A34A').font('Times-Bold').fontSize(10).text("SIGNÉ ÉLECTRONIQUEMENT", textX, textY);
        textY += 15;
        
        doc.fillColor('#000000').font('Times-Roman').fontSize(8);
        doc.text(`Signataire : ${lease.tenant.name?.toUpperCase()}`, textX, textY);
        textY += 10;
        doc.text(`Date : ${formatDateTime(tenantSignature.signedAt)}`, textX, textY);
        textY += 10;
        doc.text(`IP : ${tenantSignature.ipAddress}`, textX, textY);
        textY += 10;
        const device = tenantSignature.userAgent ? tenantSignature.userAgent.substring(0, 25) + "..." : "Device inconnu";
        doc.text(`Device : ${device}`, textX, textY);
    } else {
        doc.fillColor('#94A3B8').font('Times-Italic').fontSize(9)
           .text("(En attente de signature)", boxX, boxY + 35, { width: boxW, align: 'center' });
    }

    // Bas de page technique
    const bottomY = doc.page.height - 40;
    doc.fontSize(7).fillColor('#64748B').text(
        `Document généré et sécurisé par Immofacile.ci | Hash: ${lease.documentHash || "En attente"} | Page 1/1`,
        MARGIN,
        bottomY,
        { align: 'center', width }
    );

    doc.end();
  });
}
