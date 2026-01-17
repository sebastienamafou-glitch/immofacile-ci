import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ✅ Singleton Prisma

// Import compatible Next.js pour éviter les bugs de polices sur Vercel
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Correction Next.js 15 (Promise)
) {
  try {
    const { id } = await params; // ✅ Await obligatoire

    // 1. SÉCURITÉ : Qui demande le fichier ?
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });

    // 2. RÉCUPÉRATION DU BAIL
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

    // 3. VÉRIFICATION DES DROITS D'ACCÈS
    // Seul le locataire du bail, le propriétaire du bien ou un admin peut télécharger
    const isTenant = lease.tenantId === user.id;
    const isOwner = lease.property.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isTenant && !isOwner && !isAdmin) {
        return NextResponse.json({ error: "Accès interdit à ce document." }, { status: 403 });
    }

    // 4. GÉNÉRATION DU PDF (Style Pro Harmonisé)
    const pdfBuffer = await generateLeasePDF(lease);

    // 5. ENVOI
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_Certifie_${lease.property.title.substring(0, 10)}_${lease.tenant.name}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
  }
}

// --- MOTEUR DE GÉNÉRATION (Votre Style Pro + Typage) ---
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Création document A4 avec marges
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    // Capture du flux
    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- DEBUT DU DESIGN ---

    // 1. EN-TÊTE
    doc.font('Times-Bold').fontSize(20).text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Times-Italic').fontSize(10).fillColor('#666666').text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019", { align: 'center' });
    doc.moveDown(2);

    // 2. PARTIES (CADRE GRIS - Votre Design)
    const startY = doc.y;
    // Fond gris clair
    doc.rect(50, startY, 495, 100).fillColor('#f9fafb').fill();
    // Bordure
    doc.strokeColor('#d1d5db').rect(50, startY, 495, 100).stroke();
    
    doc.fillColor('#000000'); // Retour au noir pour le texte
    
    // Colonne Gauche : Bailleur
    doc.font('Times-Bold').fontSize(9).text("DÉSIGNATION DU BAILLEUR :", 70, startY + 15);
    doc.font('Times-Bold').fontSize(12).text((lease.property.owner?.name || "N/A").toUpperCase(), 70, startY + 30, { width: 200 });
    doc.font('Times-Roman').fontSize(10).text(`Email : ${lease.property.owner?.email}`, 70, startY + 50, { width: 200 });
    if(lease.property.owner?.phone) doc.text(`Tél : ${lease.property.owner.phone}`, 70, startY + 65, { width: 200 });

    // Colonne Droite : Preneur
    doc.font('Times-Bold').fontSize(9).text("DÉSIGNATION DU PRENEUR :", 320, startY + 15);
    doc.font('Times-Bold').fontSize(12).text((lease.tenant?.name || "N/A").toUpperCase(), 320, startY + 30, { width: 200 });
    doc.font('Times-Roman').fontSize(10).text(`Email : ${lease.tenant?.email}`, 320, startY + 50, { width: 200 });
    if(lease.tenant?.phone) doc.text(`Tél : ${lease.tenant.phone}`, 320, startY + 65, { width: 200 });

    doc.moveDown(7); // Ajustement espacement après la boîte

    // 3. ARTICLES DU CONTRAT (Fonction utilitaire)
    const addArticle = (title: string, content: string) => {
        doc.moveDown(1);
        doc.font('Times-Bold').fontSize(11).fillColor('#000000').text(title, { underline: true });
        doc.moveDown(0.5);
        doc.font('Times-Roman').fontSize(11).fillColor('#333333')
           .text(content, { align: 'justify', width: 495, lineGap: 2 });
    };

    // CONTENU JURIDIQUE
    addArticle("ARTICLE 1 : OBJET DU CONTRAT", 
        `Le Bailleur donne en location au Preneur les locaux situés à : ${lease.property.address}, ${lease.property.commune}. \nLe bien est désigné comme suit : ${lease.property.title}.`
    );

    addArticle("ARTICLE 2 : DURÉE", 
        `Le présent bail est consenti pour une durée d'un (1) an renouvelable par tacite reconduction, prenant effet le ${new Date(lease.startDate).toLocaleDateString("fr-FR", {dateStyle: 'long'})}.`
    );

    addArticle("ARTICLE 3 : LOYER ET CHARGES", 
        `Le loyer mensuel est fixé à la somme de ${(lease.monthlyRent || 0).toLocaleString()} FCFA, payable d'avance. Le dépôt de garantie est fixé à ${(lease.depositAmount || 0).toLocaleString()} FCFA.`
    );

    addArticle("ARTICLE 4 : OBLIGATIONS", 
        "Le Preneur s'engage à payer le loyer, à user paisiblement des lieux, et à répondre des dégradations. Le Bailleur s'engage à fournir un logement décent et à assurer la jouissance paisible."
    );

    // 4. SIGNATURES & PREUVES
    doc.moveDown(3);
    
    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#000000').stroke();
    doc.moveDown(1);
    
    doc.fontSize(10).font('Times-Italic').text(`Fait à Abidjan, le ${new Date().toLocaleDateString("fr-FR", {dateStyle: 'long'})}.`, { align: 'center' });
    doc.moveDown(2);

    const signY = doc.y;

    // Zone Bailleur
    doc.font('Times-Bold').fillColor('#000000').text("POUR LE BAILLEUR", 70, signY);
    doc.rect(70, signY + 15, 200, 70).stroke(); // Boîte signature
    
    // Si actif, on simule une signature propriétaire
    if (lease.status === 'ACTIVE') {
        doc.font('Courier').fontSize(8).fillColor('green').text("[ VALIDÉ PAR IMMOFACILE ]", 90, signY + 45);
    } else {
        doc.font('Times-Italic').fontSize(8).fillColor('#999').text("(Signature en attente)", 110, signY + 45);
    }

    // Zone Preneur
    doc.fillColor('#000000').font('Times-Bold').fontSize(10).text("POUR LE PRENEUR", 340, signY);
    doc.rect(340, signY + 15, 200, 70).stroke(); // Boîte signature

    // Tampon de signature numérique LOCATAIRE
    const isSigned = lease.signatureStatus === 'SIGNED_TENANT' || lease.signatureStatus === 'COMPLETED';

    if (isSigned) {
        doc.fillColor('green').fontSize(12).font('Times-Bold').text("SIGNÉ NUMÉRIQUEMENT", 360, signY + 35);
        doc.fillColor('black').fontSize(8).font('Courier')
           .text(`Date : ${new Date(lease.updatedAt).toLocaleString()}`, 360, signY + 55)
           .text(`ID : ${lease.documentHash ? lease.documentHash.substring(0, 15) + '...' : 'N/A'}`, 360, signY + 65);
    } else {
        doc.font('Times-Italic').fontSize(8).fillColor('#999').text("(En attente de signature)", 380, signY + 45);
    }

    // Footer technique
    doc.fontSize(7).fillColor('#999').font('Courier')
       .text(`Document généré par ImmoFacile - Ref: ${lease.id} - Page 1/1`, 50, 800, { align: 'center' });

    doc.end();
  });
}
