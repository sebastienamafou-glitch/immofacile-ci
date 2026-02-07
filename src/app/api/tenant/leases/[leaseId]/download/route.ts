import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


// Import compatible Next.js pour le moteur PDF serveur
const PDFDocument = require("pdfkit/js/pdfkit.standalone");

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { leaseId: string } } // ✅ CORRECTION : Format Next.js 14
) {
  try {
    const { leaseId } = params; // Pas de await en Next.js 14

    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true, email: true } // Optimisation select
    });

    if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });

    // 2. RÉCUPÉRATION DU BAIL
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        property: { 
            include: { 
                owner: { select: { id: true, name: true, email: true } } 
            } 
        },
        tenant: { select: { id: true, name: true, email: true } },
        signatures: true
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    // 3. VÉRIFICATION DES DROITS (ACL)
    // - Le locataire du bail
    // - Le propriétaire du bien
    // - Un Super Admin
    const isTenant = lease.tenantId === user.id;
    const isOwner = lease.property.ownerId === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN';

    if (!isTenant && !isOwner && !isAdmin) {
        console.error(`[PDF SECURITY] Tentative accès non autorisé User ${user.id} sur Bail ${leaseId}`);
        return NextResponse.json({ error: "Accès interdit à ce document." }, { status: 403 });
    }

    // 4. GÉNÉRATION DU PDF
    const pdfBuffer = await generateLeasePDF(lease);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Contrat_Bail_${lease.id.substring(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Erreur PDF:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// --- MOTEUR DE GÉNÉRATION (PDFKit) ---
function generateLeasePDF(lease: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: any) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // En-tête
    doc.fontSize(20).font('Helvetica-Bold').text("CONTRAT DE BAIL", { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Réf: ${lease.id}`, { align: 'center' });
    doc.moveDown(1);
    
    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // 1. Les Parties (Avec Null Safety)
    doc.fontSize(12).font('Helvetica-Bold').text("1. LES PARTIES");
    doc.fontSize(10).font('Helvetica')
       .text(`BAILLEUR : ${lease.property.owner?.name || 'Non défini'} (${lease.property.owner?.email || 'N/A'})`)
       .text(`LOCATAIRE : ${lease.tenant?.name || 'Non défini'} (${lease.tenant?.email || 'N/A'})`);
    doc.moveDown(1);

    // 2. Le Bien
    doc.fontSize(12).font('Helvetica-Bold').text("2. LE BIEN");
    doc.fontSize(10).font('Helvetica')
       .text(`Adresse : ${lease.property.address}, ${lease.property.commune}`)
       .text(`Type : ${lease.property.title}`);
    doc.moveDown(1);

    // 3. Finances
    doc.fontSize(12).font('Helvetica-Bold').text("3. CONDITIONS FINANCIÈRES");
    doc.fontSize(10).font('Helvetica')
       .text(`Loyer Mensuel : ${lease.monthlyRent.toLocaleString()} FCFA`)
       .text(`Caution : ${lease.depositAmount.toLocaleString()} FCFA`)
       .text(`Début du bail : ${new Date(lease.startDate).toLocaleDateString('fr-FR')}`);
    doc.moveDown(2);

    // 4. Signature & Preuve
    doc.fontSize(12).font('Helvetica-Bold').text("4. SIGNATURES & VALIDATION");
    doc.moveDown(1);

    const isSigned = lease.signatureStatus === "SIGNED_TENANT" || lease.signatureStatus === "TERMINATED"; // Adapté au nouveau statut
    
    if (isSigned) {
        doc.fillColor('green').text("[ DOCUMENT SIGNÉ ÉLECTRONIQUEMENT ]", { align: 'center' });
        doc.fillColor('black').fontSize(8).text(`Dernière mise à jour : ${new Date(lease.updatedAt).toLocaleString()}`, { align: 'center' });
        if(lease.documentHash) {
            doc.text(`Empreinte numérique (Hash) : ${lease.documentHash}`, { align: 'center' });
        }
    } else {
        doc.fillColor('red').text("[ DOCUMENT PROVISOIRE - NON SIGNÉ ]", { align: 'center' });
    }

    doc.end();
  });
}
