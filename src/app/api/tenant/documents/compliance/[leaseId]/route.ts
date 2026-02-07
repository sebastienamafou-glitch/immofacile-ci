import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

// Import compatible Next.js pour le moteur PDF serveur
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    // 1. SÉCURITÉ : Qui demande le fichier ?
    const session = await auth();
if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const userId = session.user.id;
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { id: true, role: true, agencyId: true } 
    });

    // 2. RÉCUPÉRATION DATA
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: { include: { owner: true } },
        tenant: true,
        signatures: true
      },
    });

    if (!lease) return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });

    // 3. DROITS D'ACCÈS (Même logique que la page)
    const isOwner = lease.property.ownerId === userId;
    const isTenant = lease.tenantId === userId;
    const isStaff = ["SUPER_ADMIN", "ADMIN"].includes(user?.role || "");
    const isAgencyAdmin = user?.role === "AGENCY_ADMIN" && 
                          user?.agencyId && 
                          lease.property.agencyId && 
                          user.agencyId === lease.property.agencyId;

    if (!isOwner && !isTenant && !isStaff && !isAgencyAdmin) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 4. GÉNÉRATION DU CERTIFICAT PDF
    const pdfBuffer = await generateCompliancePDF(lease);

    // 5. RETOUR DU FICHIER
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificat_Conformite_${leaseId.split('-')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- MOTEUR PDF (CERTIFICAT) ---
function generateCompliancePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // -- HEADER --
    doc.rect(0, 0, 595, 120).fill('#0B1120');
    
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#F59E0B')
       .text("CERTIFICAT DE CONFORMITÉ", 50, 45);
    
    doc.font('Helvetica').fontSize(10).fillColor('#94A3B8')
       .text("INFRASTRUCTURE IMMOFACILE • LOI 2019-576", 50, 75);

    doc.font('Courier').fontSize(10).fillColor('#FFFFFF')
       .text(`REF: ${lease.id.toUpperCase()}`, 50, 90, { align: 'right', width: 495 });

    // -- INFO BIEN --
    doc.moveDown(5);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B').text("1. IDENTIFICATION DU BIEN");
    doc.rect(50, doc.y + 5, 495, 1).fill('#E2E8F0');
    doc.moveDown(1);

    doc.font('Helvetica').fontSize(10).fillColor('#475569')
       .text(`Bien: ${lease.property.title}`)
       .text(`Adresse: ${lease.property.address}, ${lease.property.commune}`)
       .text(`Loyer Mensuel: ${lease.monthlyRent.toLocaleString()} FCFA`)
       .text(`Caution Versée: ${lease.depositAmount.toLocaleString()} FCFA`);

    // -- CONTRÔLE DE CONFORMITÉ --
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B').text("2. AUDIT DE CONFORMITÉ (LOI 2019)");
    doc.rect(50, doc.y + 5, 495, 1).fill('#E2E8F0');
    doc.moveDown(1);

    const legalLimit = lease.monthlyRent * 2;
    const isDepositValid = lease.depositAmount <= legalLimit;
    const isSigned = lease.signatureStatus === 'COMPLETED' || lease.signatureStatus === 'SIGNED_TENANT';

    const checkItem = (label: string, valid: boolean, detail: string) => {
        const y = doc.y;
        doc.circle(60, y + 5, 3).fill(valid ? '#10B981' : '#EF4444');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1E293B').text(label, 75, y);
        doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(detail, 75, y + 12);
        doc.moveDown(1.5);
    };

    checkItem("Plafonnement de la Caution", isDepositValid, 
        `Actuel: ${lease.depositAmount} FCFA (Max légal: ${legalLimit} FCFA)`);
    
    checkItem("Identification Bailleur (KYC)", lease.property.owner.kycStatus === 'VERIFIED', 
        `Propriétaire: ${(lease.property.owner.name || 'N/A').toUpperCase()}`);

    checkItem("Identification Locataire (KYC)", lease.tenant.kycStatus === 'VERIFIED', 
        `Locataire: ${(lease.tenant.name || 'N/A').toUpperCase()}`);

    // -- PREUVE TECHNIQUE --
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B').text("3. PREUVE NUMÉRIQUE");
    doc.rect(50, doc.y + 5, 495, 1).fill('#E2E8F0');
    doc.moveDown(1);

    if (isSigned && lease.signatures.length > 0) {
        const proof = lease.signatures[0];
        doc.font('Courier').fontSize(9).fillColor('#334155')
           .text(`Statut: SIGNATURE VALIDÉE`)
           .text(`Horodatage: ${new Date(proof.signedAt).toISOString()}`)
           .text(`IP Signataire: ${proof.ipAddress}`)
           .text(`Hash (SHA-256): ${lease.documentHash || 'N/A'}`);
    } else {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#EF4444')
           .text("Ce document est en attente de signature électronique.");
    }

    // -- FOOTER --
    doc.text("", 50, 750); // Push to bottom
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#94A3B8')
       .text("DOCUMENT GÉNÉRÉ AUTOMATIQUEMENT PAR LA PLATEFORME IMMOFACILE.", { align: 'center' });
    doc.font('Helvetica').fontSize(7)
       .text(`ID Unique: ${lease.id} • Date: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
  });
}
