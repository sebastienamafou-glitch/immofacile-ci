import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next.js 15
) {
  try {
    const { id } = await params;

    // 1. SÉCURITÉ ZERO TRUST : Qui demande le fichier ?
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    // 2. RÉCUPÉRATION SÉCURISÉE
    // On cherche le bail, mais on vérifiera les droits juste après
    const lease = await prisma.lease.findUnique({
      where: { id },
      include: {
        property: { 
            include: { 
                owner: { select: { id: true, name: true, email: true, phone: true, address: true } } 
            } 
        },
        tenant: { select: { id: true, name: true, email: true, phone: true, address: true } },
        signatures: true
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 3. CONTRÔLE D'ACCÈS (ACL)
    const isOwner = lease.property.owner.id === userId;
    const isTenant = lease.tenant.id === userId;

    if (!isOwner && !isTenant) {
        return NextResponse.json({ error: "Accès refusé à ce document confidentiel." }, { status: 403 });
    }

    // 4. GÉNÉRATION DU PDF
    const pdfBuffer = await generateLeasePDF(lease);

    // Nom de fichier propre (Ex: Bail_Villa_Cocody.pdf)
    const safeTitle = lease.property.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    const filename = `Bail_${safeTitle}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la génération" }, { status: 500 });
  }
}

// --- GÉNÉRATEUR PDF COMPLET (Moteur Graphique) ---
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Création du document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- EN-TÊTE ---
    doc.font('Helvetica-Bold').fontSize(20)
       .text("CONTRAT DE BAIL À USAGE D'HABITATION", { align: 'center' });
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#64748b')
       .text("Régis par la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat.", { align: 'center' });
    doc.moveDown(2);

    // --- BLOCS PARTIES (Cadres grisés) ---
    const startY = doc.y;
    
    // BAILLEUR (Cadre Gauche)
    doc.rect(50, startY, 240, 110).fill('#f8fafc'); 
    doc.rect(50, startY, 240, 110).stroke('#e2e8f0'); 
    
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text("LE BAILLEUR (PROPRIÉTAIRE)", 65, startY + 15);
    doc.font('Helvetica-Bold').fontSize(12).text(lease.property.owner?.name?.toUpperCase() || "NOM BAILLEUR", 65, startY + 30);
    
    doc.font('Helvetica').fontSize(9).fillColor('#334155')
       .text(`Domicilié(e) à Abidjan`, 65, startY + 50)
       .text(`Email : ${lease.property.owner?.email}`, 65, startY + 65)
       .text(`Tél : ${lease.property.owner?.phone}`, 65, startY + 80);

    // PRENEUR (Cadre Droite)
    doc.rect(305, startY, 240, 110).fill('#f8fafc');
    doc.rect(305, startY, 240, 110).stroke('#e2e8f0');

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text("LE PRENEUR (LOCATAIRE)", 320, startY + 15);
    doc.font('Helvetica-Bold').fontSize(12).text(lease.tenant?.name?.toUpperCase() || "NOM LOCATAIRE", 320, startY + 30);

    doc.font('Helvetica').fontSize(9).fillColor('#334155')
       .text(`Agissant en son nom personnel`, 320, startY + 50)
       .text(`Email : ${lease.tenant?.email}`, 320, startY + 65)
       .text(`Tél : ${lease.tenant?.phone}`, 320, startY + 80);

    doc.moveDown(9);

    // --- CORPS DU CONTRAT ---
    doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
       .text("IL A ÉTÉ ARRÊTÉ ET CONVENU CE QUI SUIT :", 50, doc.y);
    doc.moveDown(1.5);

    // ARTICLE 1 : OBJET
    doc.font('Helvetica-Bold').text("ARTICLE 1 : OBJET ET CONSISTANCE", { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Le Bailleur donne en location au Preneur, qui accepte, les locaux à usage d'habitation sis à :`, { continued: true });
    doc.font('Helvetica-Bold').text(` ${lease.property.address}, ${lease.property.commune}.`);
    doc.font('Helvetica').text(`Le bien loué, objet du présent bail, consiste en : ${lease.property.title}. Le Preneur déclare bien connaître les lieux pour les avoir visités.`);
    doc.moveDown(1);

    // ARTICLE 2 : DURÉE
    doc.font('Helvetica-Bold').text("ARTICLE 2 : DURÉE ET RENOUVELLEMENT", { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Le présent bail est consenti pour une durée ferme d'un (1) an, commençant à courir le ${new Date(lease.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}. Il se renouvellera ensuite par tacite reconduction pour la même durée, sauf congé donné par l'une des parties par acte extrajudiciaire ou lettre recommandée avec avis de réception.`, { align: 'justify' });
    doc.moveDown(1);

    // ARTICLE 3 : FINANCE (Encadré)
    const yFinance = doc.y;
    doc.rect(50, yFinance - 5, 495, 80).fill('#fcfdfc').stroke('#e5e7eb'); 
    
    doc.fillColor('black').font('Helvetica-Bold').text("ARTICLE 3 : CONDITIONS FINANCIÈRES", 60, yFinance + 10, { underline: true });
    
    doc.font('Helvetica').fontSize(10)
       .text(`• Loyer Mensuel : Le loyer est fixé à la somme principale de `, 60, yFinance + 30, { continued: true })
       .font('Helvetica-Bold').text(`${lease.monthlyRent.toLocaleString('fr-FR')} FCFA.`);
       
    doc.font('Helvetica').text(`• Date de paiement : Le loyer est payable d'avance au plus tard le 05 de chaque mois.`, 60, yFinance + 45);
    
    doc.font('Helvetica').text(`• Dépôt de Garantie : Le Preneur verse ce jour la somme de `, 60, yFinance + 60, { continued: true })
       .font('Helvetica-Bold').text(`${lease.depositAmount.toLocaleString('fr-FR')} FCFA`, { continued: true })
       .font('Helvetica').text(`, correspondant à deux (2) mois de loyer.`);

    doc.moveDown(5);

    // ARTICLE 4 : RÉVISION
    doc.font('Helvetica-Bold').text("ARTICLE 4 : RÉVISION DU LOYER", { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Conformément à la Loi, le loyer pourra être révisé tous les trois (3) ans. La majoration ne pourra excéder la variation de l'indice de référence des loyers publié par l'autorité compétente.`, { align: 'justify' });
    doc.moveDown(1);

    // ARTICLE 5 : OBLIGATIONS
    doc.font('Helvetica-Bold').text("ARTICLE 5 : OBLIGATIONS ET ENTRETIEN", { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Le Preneur est tenu : De payer le loyer aux termes convenus, d'user paisiblement des lieux ("en bon père de famille"), d'assurer l'entretien courant et les menues réparations locatives. Il est responsable des dégradations survenant pendant la location.`, { align: 'justify' });
    doc.moveDown(0.5);
    doc.text(`Le Bailleur est tenu : De délivrer un logement décent, d'assurer au locataire la jouissance paisible des lieux et d'effectuer toutes les grosses réparations (structure, toiture) nécessaires au maintien en état du logement.`, { align: 'justify' });
    doc.moveDown(1);

    // ARTICLE 6 : CLAUSE RÉSOLUTOIRE
    doc.font('Helvetica-Bold').text("ARTICLE 6 : CLAUSE RÉSOLUTOIRE", { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`À défaut de paiement d'un seul terme de loyer à son échéance, ou d'inexécution d'une seule des clauses du bail, et un mois après un simple commandement de payer ou une mise en demeure restée infructueuse, le bail sera résilié de plein droit si bon semble au Bailleur.`, { align: 'justify' });
    doc.moveDown(2);

    // --- SIGNATURES ---
    const signY = doc.y;
    doc.font('Helvetica').text("Fait à Abidjan, en deux exemplaires originaux.", 50, signY);
    doc.moveDown(2);

    const yBox = doc.y;
    
    // BAILLEUR
    doc.font('Helvetica-Bold').text("LE BAILLEUR (PROPRIÉTAIRE)", 60, yBox);
    doc.font('Helvetica').fontSize(10).text(lease.property.owner?.name?.toUpperCase(), 60, yBox + 15);
    doc.font('Helvetica-Oblique').fontSize(8).text("(Lu et approuvé)", 60, yBox + 30);
    
    // PRENEUR
    doc.font('Helvetica-Bold').text("LE PRENEUR (LOCATAIRE)", 350, yBox);
    doc.font('Helvetica').fontSize(10).text(lease.tenant?.name?.toUpperCase(), 350, yBox + 15);
    doc.font('Helvetica-Oblique').fontSize(8).text("(Lu et approuvé)", 350, yBox + 30);

    // --- TAMPON SIGNATURE ÉLECTRONIQUE ---
    // Logique : Si le statut est "SIGNED_TENANT" ou "COMPLETED", on affiche le tampon
    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED";
    
    // On prend la preuve de signature la plus récente
    const signatureProof = lease.signatures && lease.signatures.length > 0 ? lease.signatures[0] : null;

    if (isSigned && signatureProof) {
        // Cadre Vert
        doc.lineWidth(2).rect(340, yBox + 40, 180, 50).stroke('#22c55e');
        
        doc.fillColor('#15803d') 
           .fontSize(10).font('Helvetica-Bold')
           .text("SIGNÉ ÉLECTRONIQUEMENT", 350, yBox + 50)
           .font('Helvetica').fontSize(8)
           .text(`Date : ${new Date(signatureProof.signedAt).toLocaleString('fr-FR')}`, 350, yBox + 65)
           .text(`IP : ${signatureProof.ipAddress}`, 350, yBox + 75);
           
        // Filigrane de fond
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(60).fillColor('red').opacity(0.1).text('IMMOFACILE ORIGINAL', 100, 400);
        doc.restore();
    }

    doc.end();
  });
}
