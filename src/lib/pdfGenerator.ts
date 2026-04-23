import { jsPDF } from "jspdf";
import { PLATFORM_OWNER } from "@/lib/constants/owner";

// 🔧 SÉCURITÉ : Valeurs par défaut si les constantes manquent
const OWNER_FALLBACK = {
  COMPANY_NAME: PLATFORM_OWNER?.COMPANY_NAME || "WebAppCI",
  INTERNAL_SIGNATURE: PLATFORM_OWNER?.INTERNAL_SIGNATURE || "WAPP-SECURE",
  ENGINE_VERSION: PLATFORM_OWNER?.ENGINE_VERSION || "1.0",
  COPYRIGHT_YEAR: PLATFORM_OWNER?.COPYRIGHT_YEAR || new Date().getFullYear(),
};

// 🔧 UTILITAIRE : Formatage monétaire robuste pour PDF
// Remplace les espaces insécables (\u00A0) par des espaces simples pour éviter les caractères bizarres
const formatMoney = (amount: any): string => {
  const num = Number(amount);
  if (isNaN(num)) return "0 FCFA";
  
  try {
    const value = new Intl.NumberFormat('fr-FR').format(num);
    return `${value.replace(/\s/g, ' ')} FCFA`;
  } catch (e) {
    return `${num} FCFA`;
  }
};

export const generateInvestmentContract = (user: any, contractData: any) => {
  // 1. 🛡️ DATA SANITIZATION (Prévention des crashs frontend)
  const safeUser = user || { name: "CLIENT NON IDENTIFIÉ", email: "N/A" };
  const safeContract = contractData || {};
  
  // Données critiques
  const packName = safeContract.packName || safeUser.backerTier || 'STANDARD';
  const amount = safeContract.amount || 0;
  const contractId = safeContract.id || `DRAFT-${Date.now().toString().slice(-6)}`; // ID Unique visible
  const dateSigned = safeContract.signedAt ? new Date(safeContract.signedAt) : new Date();

  const doc = new jsPDF();
  
  // 2. 🔒 MÉTADONNÉES PDF (Preuve numérique invisible)
  doc.setProperties({
    title: `Contrat Partenariat - ${safeUser.name || 'Investisseur'}`,
    subject: `Investissement Immobilier - Réf: ${contractId}`,
    author: OWNER_FALLBACK.COMPANY_NAME,
    keywords: `contrat, ${contractId}, legal, ohada`,
    creator: `Babimmo Engine v${OWNER_FALLBACK.ENGINE_VERSION}`
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // --- HEADER ---
  doc.setFillColor(248, 250, 252); // Gris très clair (Slate-50)
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE PARTENARIAT FINANCIER", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont("helvetica", "normal");
  doc.text("Sous seing privé électronique - Conforme Loi n° 2013-546 (Côte d'Ivoire)", pageWidth / 2, 28, { align: "center" });

  // ✅ AJOUT CRUCIAL : RÉFÉRENCE UNIQUE (Lien DB <-> Papier)
  doc.setFontSize(8);
  doc.setTextColor(220, 38, 38); // Rouge discret pour l'ID
  doc.text(`Réf. Unique : ${contractId}`, margin, 35);

  // --- LES PARTIES ---
  let yPos = 55;
  
  doc.setDrawColor(203, 213, 225); 
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 55, 2, 2, 'S'); // 'S' pour Stroke uniquement (plus propre à l'impression)
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", margin + 5, yPos);
  
  yPos += 10;
  // Partie 1 : L'Entreprise
  doc.setFont("helvetica", "bold");
  doc.text(`1. La société ${OWNER_FALLBACK.COMPANY_NAME}`, margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Société éditrice de solutions numériques. Siège social : Abidjan, Côte d'Ivoire.", margin + 5, yPos + 5);
  doc.text("Représentée par son Gérant. Ci-après dénommée \"L'Entreprise\".", margin + 5, yPos + 10);
  
  yPos += 20;
  // Partie 2 : L'Investisseur
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const userName = safeUser.name ? safeUser.name.toUpperCase() : "................................................";
  doc.text(`2. M./Mme ${userName}`, margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Email / Identifiant : ${safeUser.email || 'Non renseigné'}`, margin + 5, yPos + 5);
  doc.text("Ci-après dénommé(e) \"L'Investisseur\".", margin + 5, yPos + 10);

  // --- ARTICLES ---
  yPos += 30;
  
  const articles = [
      {
          title: "ARTICLE 1 : OBJET DU CONTRAT",
          content: `Le présent contrat a pour objet de formaliser l'apport financier de l'Investisseur au développement de la plateforme immobilière "Babimmo". L'Investisseur souscrit au pack "${packName}" pour un montant ferme et définitif de ${formatMoney(amount)}.`
      },
      {
          title: "ARTICLE 2 : DESTINATION DES FONDS",
          content: "Les fonds versés seront affectés exclusivement aux postes suivants : infrastructure technique (serveurs), développement logiciel (IA), marketing digital et expansion régionale."
      },
      {
          title: "ARTICLE 3 : PREUVE ET SIGNATURE ÉLECTRONIQUE",
          content: `Conformément à la Loi n° 2013-546 relative aux transactions électroniques, l'usage de la signature électronique via la plateforme vaut identification du signataire et manifeste son consentement irrévocable. Les logs de connexion (IP, Horodatage) associés à la transaction "${contractId}" feront foi.`
      },
      {
          title: "ARTICLE 4 : DROIT APPLICABLE",
          content: "Le présent contrat est régi par le droit ivoirien et les Actes Uniformes de l'OHADA. Compétence exclusive est attribuée au Tribunal de Commerce d'Abidjan."
      }
  ];

  articles.forEach(article => {
      // Gestion du saut de page
      if (yPos > 250) { 
          doc.addPage(); 
          yPos = 30; // Marge haute sur nouvelle page
      }
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.text(article.title, margin, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42); 
      doc.setFontSize(10);
      
      // Découpage du texte pour qu'il tienne dans la largeur
      const splitText = doc.splitTextToSize(article.content, contentWidth);
      doc.text(splitText, margin, yPos);
      
      yPos += (splitText.length * 5) + 10; 
  });

  // --- ZONE DE SIGNATURE ---
  // On force une nouvelle page si on est trop bas, pour ne pas couper le bloc signature
  if (yPos > 210) { doc.addPage(); yPos = 30; }
  
  yPos += 10;
  doc.setDrawColor(15, 23, 42); 
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, contentWidth, 60); // Cadre signature
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); // Orange Babimmo
  doc.text("CLÔTURE ET SIGNATURES", margin + 5, yPos + 10);

  // Bloc Entreprise
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(`Pour ${OWNER_FALLBACK.COMPANY_NAME}`, margin + 5, yPos + 25);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text("Signé électroniquement par l'Administrateur", margin + 5, yPos + 35);
  doc.text(`Certificat Serveur: ${OWNER_FALLBACK.INTERNAL_SIGNATURE}`, margin + 5, yPos + 40);

  // Bloc Investisseur
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); 
  doc.text("Pour L'Investisseur (Lu et approuvé)", pageWidth / 2 + 10, yPos + 25);
  
  // Affichage Signature Image
  if (safeContract.signatureData) {
      try {
        const sigData = safeContract.signatureData;
        // Vérif basique format image
        if (typeof sigData === 'string' && sigData.startsWith('data:image')) {
            doc.addImage(sigData, 'PNG', pageWidth / 2 + 10, yPos + 30, 40, 20);
        }
        
        // Métadonnées techniques sous la signature
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.setFont("courier", "normal"); // Police monospace pour l'aspect technique
        doc.text(`IP Signataire: ${safeContract.ipAddress || 'Non enregistrée'}`, pageWidth / 2 + 10, yPos + 55);
        doc.text(`TS: ${dateSigned.toISOString()}`, pageWidth - margin - 50, yPos + 55);
      } catch (e) {
          console.error("Erreur rendu signature PDF", e);
          doc.setTextColor(255, 0, 0);
          doc.text("[Erreur affichage signature]", pageWidth / 2 + 10, yPos + 40);
      }
  } else {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("[En attente de signature]", pageWidth / 2 + 10, yPos + 40);
  }

  // --- FOOTER "COPYRIGHT" & HASH ---
  const footerY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setTextColor(150); 
  doc.setFont("helvetica", "normal");
  
  const copyrightText = `Document généré par ${OWNER_FALLBACK.COMPANY_NAME} © ${OWNER_FALLBACK.COPYRIGHT_YEAR} • ID Transaction: ${contractId} • Ce document vaut preuve juridique.`;
  doc.text(copyrightText, pageWidth / 2, footerY, { align: "center" });
  
  // Nom de fichier propre
  const safeFileName = (safeUser.name || 'Contrat').replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const fileName = `CONTRAT_${safeFileName}_${contractId}.pdf`;
  
  doc.save(fileName);
};

export const generateRentReceiptPDF = (data: {
  receiptNumber: string;
  tenantName: string;
  propertyName: string;
  propertyAddress: string;
  amount: number;
  period: string;
  agencyName: string;
  datePaid: Date;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFillColor(22, 163, 74); // Vert Émeraude pour le succès/cash
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("QUITTANCE DE LOYER (ESPÈCES)", margin, 20);

  // Méta
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`Reçu N°: ${data.receiptNumber}`, margin, 45);
  doc.text(`Date de paiement: ${new Date(data.datePaid).toLocaleDateString('fr-FR')}`, margin, 52);

  // Blocs Parties
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Émis par :", margin, 70);
  doc.setFont("helvetica", "normal");
  doc.text(data.agencyName, margin, 77);

  doc.setFont("helvetica", "bold");
  doc.text("Reçu de :", pageWidth / 2, 70);
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, pageWidth / 2, 77);

  // Corps
  const bodyY = 100;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, bodyY, pageWidth - (margin * 2), 60, 'FD');

  doc.setFont("helvetica", "normal");
  doc.text("Je soussigné(e), déclare avoir reçu le paiement correspondant au loyer", margin + 5, bodyY + 15);
  doc.text(`et aux charges pour la période de : ${data.period}.`, margin + 5, bodyY + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Bien concerné :", margin + 5, bodyY + 35);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.propertyName} - ${data.propertyAddress}`, margin + 5, bodyY + 42);

  // Montant
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(`TOTAL PAYÉ : ${formatMoney(data.amount)}`, margin + 5, bodyY + 52);

  // Pied de page
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text("Paiement certifié effectué en espèces de la main à la main.", margin, 180);
  doc.text("Cette quittance annule tous les reçus provisoires donnés antérieurement.", margin, 186);

  // Signature
  doc.setFont("helvetica", "bold");
  doc.text("L'Agence (Cachet et Signature)", pageWidth - margin - 60, 205);
  
  const safeFileName = data.tenantName.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  doc.save(`Quittance_Cash_${data.period.replace(/\s+/g, '_')}_${safeFileName}.pdf`);
};
