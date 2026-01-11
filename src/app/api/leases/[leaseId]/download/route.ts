import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsPDF } from "jspdf";

export async function GET(
  request: Request,
  { params }: { params: { leaseId: string } }
) {
  try {
    const { leaseId } = params;

    // 1. Récupération des données
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

    // Fonction utilitaire pour gérer les textes longs (retour à la ligne)
    const addParagraph = (text: string, fontSize = 10, fontType = "normal") => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontType);
        const splitText = doc.splitTextToSize(text, contentWidth);
        
        // Vérification saut de page
        if (y + (splitText.length * 5) > 280) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 3; // Espace après paragraphe
    };

    // --- EN-TÊTE LEGAL ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRAT DE BAIL À USAGE D'HABITATION", pageWidth / 2, y, { align: "center" });
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Soumis aux dispositions de la Loi n° 2019-576 du 26 juin 2019", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text("instituant le Code de la Construction et de l'Habitat en Côte d'Ivoire", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // --- 1. IDENTIFICATION DES PARTIES ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTRE LES SOUSSIGNÉS :", margin, y);
    y += 10;

    // LE BAILLEUR
    addParagraph(`Le BAILLEUR (Propriétaire) : ${lease.property.owner?.name || "Propriétaire non identifié"}`, 11, "bold");
    addParagraph(`Représenté par la plateforme de gestion ImmoFacile.`, 10, "normal");
    
    y += 2;
    doc.text("D'une part,", margin, y);
    y += 8;

    // LE PRENEUR
    addParagraph(`ET Le PRENEUR (Locataire) : ${lease.tenant?.name || "Locataire"}`, 11, "bold");
    addParagraph(`Email : ${lease.tenant?.email || "N/A"} - Tél : ${lease.tenant?.phone || "N/A"}`, 10, "normal");

    y += 2;
    doc.text("D'autre part,", margin, y);
    y += 10;

    addParagraph("Il a été convenu et arrêté ce qui suit :", 10, "italic");
    y += 5;

    // --- 2. OBJET DU CONTRAT ---
    doc.setFillColor(240, 240, 240); // Gris clair
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("ARTICLE 1 : OBJET DU CONTRAT", margin + 2, y + 1);
    y += 10;

    addParagraph(`Le Bailleur donne en location, à usage exclusif d'habitation, les locaux situés à : ${lease.property.address}, ${lease.property.commune}.`);
    addParagraph(`Désignation du bien : ${lease.property.title} (Comprenant ${lease.property.bedrooms || "?"} pièces principales).`);

    // --- 3. DURÉE ---
    y += 5;
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.text("ARTICLE 2 : DURÉE", margin + 2, y + 1);
    y += 10;

    const startDate = new Date(lease.startDate).toLocaleDateString("fr-FR");
    addParagraph(`Le présent bail est consenti pour une durée d'un (1) an renouvelable par tacite reconduction.`);
    addParagraph(`Il prend effet à compter du : ${startDate}.`);
    addParagraph(`Le délai de préavis pour la résiliation est fixé à trois (3) mois, conformément à la loi en vigueur.`);

    // --- 4. LOYER ET CHARGES ---
    y += 5;
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.text("ARTICLE 3 : LOYER ET PAIEMENT", margin + 2, y + 1);
    y += 10;

    const loyer = lease.monthlyRent.toLocaleString('fr-FR');
    addParagraph(`Le loyer mensuel est fixé à la somme de : ${loyer} FCFA.`);
    addParagraph(`Le loyer est payable d'avance, au plus tard le 05 de chaque mois.`);
    addParagraph(`La révision du loyer ne pourra intervenir que tous les trois (3) ans, dans la limite des plafonds fixés par la réglementation ivoirienne.`);

    // --- 5. DÉPÔT DE GARANTIE (CAUTION) ---
    y += 5;
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.text("ARTICLE 4 : DÉPÔT DE GARANTIE (CAUTION)", margin + 2, y + 1);
    y += 10;

    const caution = lease.depositAmount.toLocaleString('fr-FR');
    addParagraph(`Le Locataire verse ce jour la somme de : ${caution} FCFA.`);
    addParagraph(`Conformément à l'article 443 de la loi n° 2019-576, cette somme correspond à deux (2) mois de loyer maximum.`);
    addParagraph(`Elle sera restituée au Locataire en fin de bail, déduction faite des sommes dues et des frais de remise en état éventuels.`);

    // --- 6. OBLIGATIONS ---
    y += 5;
    doc.rect(margin, y - 5, contentWidth, 10, 'F');
    doc.text("ARTICLE 5 : OBLIGATIONS ET ENREGISTREMENT", margin + 2, y + 1);
    y += 10;

    addParagraph(`Le Locataire s'engage à user des lieux en "bon père de famille" et à entretenir le logement.`);
    addParagraph(`L'enregistrement du présent bail auprès de l'administration fiscale est obligatoire et incombe au Locataire (sauf accord contraire).`);
    addParagraph(`En cas de litige, compétence est attribuée aux Tribunaux d'Abidjan.`);

    // --- SIGNATURES ---
    if (y + 50 > 280) { doc.addPage(); y = 20; }
    y += 20;

    doc.setLineWidth(0.2);
    doc.rect(margin, y, 80, 40); // Cadre Bailleur
    doc.rect(pageWidth - margin - 80, y, 80, 40); // Cadre Locataire

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Le BAILLEUR", margin + 10, y + 10);
    doc.text("Le PRENEUR (Locataire)", pageWidth - margin - 70, y + 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Lu et approuvé", margin + 10, y + 15);
    doc.text("Lu et approuvé", pageWidth - margin - 70, y + 15);

    // GESTION ETAT SIGNATURE
    const signatureProof = lease.signatures.length > 0 ? lease.signatures[0] : null;
    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED";

    if (isSigned && signatureProof) {
        doc.setTextColor(0, 128, 0); // Vert
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Signé électroniquement le :`, pageWidth - margin - 75, y + 25);
        doc.text(`${new Date(signatureProof.signedAt).toLocaleDateString("fr-FR")}`, pageWidth - margin - 75, y + 30);
        doc.setFontSize(7);
        doc.text(`IP: ${signatureProof.ipAddress || "Authentifiée"}`, pageWidth - margin - 75, y + 35);
    } else {
        doc.setTextColor(200, 0, 0); // Rouge
        doc.text("EN ATTENTE DE SIGNATURE", pageWidth - margin - 70, y + 30);
    }
    
    doc.setTextColor(0); // Reset couleur

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`ImmoFacile - Contrat généré le ${new Date().toLocaleDateString()} - Page 1/1`, pageWidth / 2, 285, { align: "center" });

    // 3. Renvoi du PDF
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_Habitation_${lease.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur production PDF:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la génération du contrat" },
      { status: 500 }
    );
  }
}
