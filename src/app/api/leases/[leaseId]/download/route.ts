import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton
import { jsPDF } from "jspdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leaseId: string }> } // ✅ Correction Next.js 15
) {
  try {
    const { leaseId } = await params; // ✅ Await obligatoire

    // 1. SÉCURITÉ : Identification de l'utilisateur
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 403 });
    }

    // 2. RÉCUPÉRATION SÉCURISÉE
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

    // 3. VÉRIFICATION DES DROITS (CRITIQUE)
    // Seuls le Locataire, le Propriétaire ou un Admin peuvent télécharger
    const isTenant = lease.tenantId === user.id;
    const isOwner = lease.property.ownerId === user.id;
    const isAdmin = user.role === "SUPER_ADMIN";

    if (!isTenant && !isOwner && !isAdmin) {
        return NextResponse.json({ error: "Accès interdit à ce document confidentiel." }, { status: 403 });
    }

    // 4. GÉNÉRATION PDF (Votre logique visuelle est conservée)
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    const addParagraph = (text: string, fontSize = 10, fontType = "normal") => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontType);
        const splitText = doc.splitTextToSize(text, contentWidth);
        
        if (y + (splitText.length * 5) > 280) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 3;
    };

    // --- EN-TÊTE ---
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

    // --- IDENTIFICATION ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTRE LES SOUSSIGNÉS :", margin, y);
    y += 10;

    // BAILLEUR
    addParagraph(`Le BAILLEUR : ${lease.property.owner?.name || "N/A"}`, 11, "bold");
    addParagraph(`Représenté par la plateforme ImmoFacile.`, 10, "normal");
    y += 2;
    doc.text("D'une part,", margin, y);
    y += 8;

    // PRENEUR
    addParagraph(`ET Le PRENEUR : ${lease.tenant?.name || "Locataire"}`, 11, "bold");
    addParagraph(`Email : ${lease.tenant?.email} - Tél : ${lease.tenant?.phone || "N/A"}`, 10, "normal");
    y += 2;
    doc.text("D'autre part,", margin, y);
    y += 10;

    addParagraph("Il a été convenu ce qui suit :", 10, "italic");
    y += 5;

    // --- CORPS DU TEXTE ---
    const sectionTitle = (title: string) => {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y - 5, contentWidth, 10, 'F');
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin + 2, y + 1);
        y += 10;
    };

    sectionTitle("ARTICLE 1 : OBJET");
    addParagraph(`Location à usage d'habitation sise à : ${lease.property.address}, ${lease.property.commune}.`);
    addParagraph(`Bien : ${lease.property.title}.`);

    y += 5;
    sectionTitle("ARTICLE 2 : DURÉE");
    addParagraph(`Durée : 1 an renouvelable. Prise d'effet : ${new Date(lease.startDate).toLocaleDateString("fr-FR")}.`);

    y += 5;
    sectionTitle("ARTICLE 3 : LOYER");
    addParagraph(`Loyer mensuel : ${lease.monthlyRent.toLocaleString('fr-FR')} FCFA, payable d'avance.`);

    y += 5;
    sectionTitle("ARTICLE 4 : CAUTION");
    addParagraph(`Dépôt de garantie : ${lease.depositAmount.toLocaleString('fr-FR')} FCFA.`);

    // --- SIGNATURES ---
    if (y + 50 > 280) { doc.addPage(); y = 20; }
    y += 20;

    doc.setLineWidth(0.2);
    doc.rect(margin, y, 80, 40); 
    doc.rect(pageWidth - margin - 80, y, 80, 40); 

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Le BAILLEUR", margin + 10, y + 10);
    doc.text("Le PRENEUR", pageWidth - margin - 70, y + 10);

    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "COMPLETED";
    
    if (isSigned) {
        doc.setTextColor(0, 128, 0);
        doc.text(`Signé numériquement`, pageWidth - margin - 75, y + 25);
        doc.setFontSize(8);
        doc.text(`${new Date(lease.updatedAt).toLocaleString()}`, pageWidth - margin - 75, y + 35);
    } else {
        doc.setTextColor(200, 0, 0);
        doc.text("NON SIGNÉ", pageWidth - margin - 70, y + 30);
    }
    doc.setTextColor(0);

    // 5. ENVOI DU BUFFER
    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bail_${lease.id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
