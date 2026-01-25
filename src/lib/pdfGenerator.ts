import { jsPDF } from "jspdf";
// ✅ IMPORT DE L'ADN (Propriété Intellectuelle)
import { PLATFORM_OWNER } from "@/lib/constants/owner";

// ✅ FIX : Formatage manuel pour éviter les slashes "/" dans le PDF
const formatMoney = (amount: number) => {
  const value = new Intl.NumberFormat('fr-FR').format(amount);
  const cleanValue = value.replace(/\s/g, ' ');
  return `${cleanValue} FCFA`;
};

export const generateInvestmentContract = (user: any, contractData: any) => {
  // Sécurité anti-crash
  const safeUser = user || { name: "INCONNU", email: "N/A", phone: "N/A" };
  const packName = contractData.packName || safeUser.backerTier || 'STANDARD';
  const amount = contractData.amount || 0;

  const doc = new jsPDF();
  
  // 🔒 SÉCURITÉ IP : INJECTION DES MÉTADONNÉES (Invisible mais juridique)
  doc.setProperties({
    title: `Contrat Partenariat - ${safeUser.name}`,
    subject: "Investissement Immobilier ImmoFacile",
    author: PLATFORM_OWNER.COMPANY_NAME, // Auteur = WebAppCI
    keywords: `contrat, investissement, ${PLATFORM_OWNER.INTERNAL_SIGNATURE}, legal`,
    creator: `WebAppCI Engine v${PLATFORM_OWNER.ENGINE_VERSION}`
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // --- HEADER ---
  doc.setFillColor(248, 250, 252); 
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); 
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE PARTENARIAT FINANCIER", pageWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); 
  doc.setFont("helvetica", "italic");
  doc.text("Sous seing privé électronique - Conforme Loi n° 2013-546 (Côte d'Ivoire)", pageWidth / 2, 28, { align: "center" });

  // --- LES PARTIES ---
  let yPos = 50;
  
  doc.setDrawColor(203, 213, 225); 
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 55, 3, 3, 'FD');
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", margin + 5, yPos);
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.text("1. La société WebAppCI", margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Société éditrice de solutions numériques. Siège social : Abidjan, Côte d'Ivoire.", margin + 5, yPos + 5);
  doc.text("Représentée par son Gérant. Ci-après dénommée \"L'Entreprise\" ou \"L'Éditeur\".", margin + 5, yPos + 10);
  
  yPos += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`2. M./Mme ${safeUser.name?.toUpperCase()}`, margin + 5, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Identifiant : ${safeUser.email}`, margin + 5, yPos + 5);
  doc.text("Ci-après dénommé(e) \"L'Investisseur\".", margin + 5, yPos + 10);

  // --- ARTICLES ---
  yPos += 30;
  doc.setFontSize(10);
  
  const articles = [
      {
          title: "ARTICLE 1 : OBJET DU CONTRAT",
          content: `Le présent contrat a pour objet de formaliser l'apport financier de l'Investisseur au développement de la plateforme immobilière "ImmoFacile", propriété exclusive de WebAppCI. L'Investisseur souscrit par la présente au "${packName}" pour un montant de ${formatMoney(amount)}.`
      },
      {
          title: "ARTICLE 2 : DESTINATION DES FONDS",
          content: "Les fonds versés seront affectés exclusivement aux postes suivants : infrastructure technique (serveurs), développement logiciel (IA), marketing digital et expansion régionale de la solution ImmoFacile."
      },
      {
          title: "ARTICLE 3 : PREUVE ET SIGNATURE ÉLECTRONIQUE",
          content: "Les parties conviennent expressément que le présent contrat est signé par voie électronique. Conformément à la Loi n° 2013-546 du 30 juillet 2013 relative aux transactions électroniques en Côte d'Ivoire, l'usage de la signature électronique via la plateforme ImmoFacile vaut identification du signataire et manifeste son consentement irrévocable au contenu de l'acte. Les logs de connexion (Adresse IP, Horodatage) conservés par WebAppCI feront foi en cas de litige."
      },
      {
          title: "ARTICLE 4 : JURIDICTION COMPÉTENTE",
          content: "Le présent contrat est régi par le droit ivoirien et les Actes Uniformes de l'OHADA. Tout litige relatif à son interprétation ou son exécution sera soumis à la compétence exclusive du Tribunal de Commerce d'Abidjan."
      }
  ];

  articles.forEach(article => {
      if (yPos > 250) { 
          doc.addPage(); 
          yPos = 20; 
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(article.title.toUpperCase(), margin, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0); 
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(article.content, contentWidth);
      doc.text(splitText, margin, yPos);
      
      yPos += (splitText.length * 5) + 8; 
  });

  // --- ZONE DE SIGNATURE ---
  if (yPos > 210) { doc.addPage(); yPos = 20; }
  
  yPos += 10;
  doc.setDrawColor(15, 23, 42); 
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, contentWidth, 55); 
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); 
  doc.text("ZONE DE CONSENTEMENT LÉGAL", margin + 5, yPos + 10);

  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(`Pour ${PLATFORM_OWNER.COMPANY_NAME} (L'Éditeur)`, margin + 5, yPos + 25);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text("Signé électroniquement - Certificat WAPP-AUTH", margin + 5, yPos + 35);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(245, 158, 11); 
  doc.text("Pour L'Investisseur (Vous)", pageWidth / 2 + 10, yPos + 25);
  
  if (contractData.signatureData) {
      try {
        doc.addImage(contractData.signatureData, 'PNG', pageWidth / 2 + 10, yPos + 28, 40, 20);
        
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.setFont("courier", "normal");
        doc.text(`IP: ${contractData.ipAddress || 'N/A'}`, pageWidth / 2 + 10, yPos + 52);
        doc.text(`TS: ${new Date(contractData.signedAt).toISOString()}`, pageWidth - margin - 50, yPos + 52);
      } catch (e) {
          console.error("Erreur image", e);
      }
  }

  // --- FOOTER "COPYRIGHT" (Marquage Visuel) ---
  const footerY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setTextColor(180); // Gris clair pour être discret mais lisible
  doc.setFont("helvetica", "normal");
  
  // Texte de propriété intellectuelle en bas de page
  const copyrightText = `Propriété exclusive de ${PLATFORM_OWNER.COMPANY_NAME} © ${PLATFORM_OWNER.COPYRIGHT_YEAR} • ID: ${PLATFORM_OWNER.INTERNAL_SIGNATURE} • Ce document est une preuve juridique générée électroniquement.`;
  doc.text(copyrightText, margin, footerY);
  
  const fileName = `Contrat_Investissement_${(safeUser.name || 'User').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
