"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Palette de couleurs Premium
const COLORS = {
  primary: '#0F172A', // Slate 900
  accent: '#EA580C',  // Orange 600
  grey: '#64748B',    // Slate 500
  light: '#F8FAFC',   // Slate 50
  border: '#E2E8F0',  // Slate 200
  green: '#059669',   // Emerald 600
  watermark: '#F1F5F9' // Très clair
};

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    color: COLORS.primary,
    fontSize: 10,
    position: 'relative'
  },
  
  // --- FILIGRANE (BACKGROUND) ---
  watermarkContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: -1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5 // React-PDF gère mal l'opacité très faible, on fait au mieux
  },
  watermarkText: {
    fontSize: 60,
    color: '#F3F4F6', // Gris très très pâle
    transform: 'rotate(-45deg)',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },

  // --- HEADER ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
    paddingBottom: 15
  },
  logoBlock: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 5
  },
  titleBig: {
    fontSize: 24,
    fontWeight: 'black', // Helvetica-Bold
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  subTitle: {
    fontSize: 8,
    color: COLORS.accent,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  refBlock: {
    textAlign: 'right'
  },
  refLabel: {
    fontSize: 7,
    color: COLORS.grey,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  refValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: COLORS.light,
    padding: '4 8',
    borderRadius: 4
  },

  // --- PARTIES ---
  partiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 20
  },
  partyBox: {
    width: '48%',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.light
  },
  partyLabel: {
    fontSize: 7,
    color: COLORS.grey,
    textTransform: 'uppercase',
    marginBottom: 5,
    fontWeight: 'bold'
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3
  },
  partyInfo: {
    fontSize: 9,
    color: COLORS.grey,
    lineHeight: 1.3
  },

  // --- BIEN & PÉRIODE ---
  infoBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    color: 'white',
    padding: 10,
    borderRadius: 6,
    marginBottom: 25,
    alignItems: 'center'
  },
  infoCol: {
    flex: 1
  },
  infoColRight: {
    flex: 1,
    textAlign: 'right',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    paddingLeft: 10
  },
  infoLabelInv: {
    fontSize: 6,
    textTransform: 'uppercase',
    color: '#94A3B8', // Slate 400
    marginBottom: 2
  },
  infoTextInv: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold'
  },

  // --- TABLEAU ---
  table: {
    width: '100%',
    marginBottom: 20
  },
  th: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 5,
    marginBottom: 5
  },
  thText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: COLORS.grey
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tdText: {
    fontSize: 10
  },
  // Colonnes
  col1: { width: '60%' },
  col2: { width: '40%', textAlign: 'right' },

  // --- TOTAUX ---
  totalBlock: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5
  },
  totalRow: {
    flexDirection: 'row',
    width: '50%',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase'
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  netToPay: {
    backgroundColor: COLORS.primary,
    color: 'white',
    padding: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  netLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  netValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold'
  },

  // --- BAS DE PAGE (SIGNATURE & TAMPON) ---
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    alignItems: 'flex-end'
  },
  legalText: {
    width: '55%',
    fontSize: 8,
    color: COLORS.grey,
    fontStyle: 'italic',
    lineHeight: 1.4
  },
  stampContainer: {
    width: 120,
    height: 120,
    borderWidth: 3,
    borderColor: '#1E3A8A', // Bleu tampon
    borderRadius: 60, // Rond
    justifyContent: 'center',
    alignItems: 'center',
    transform: 'rotate(-12deg)',
    opacity: 0.8
  },
  stampTitle: {
    color: '#1E3A8A',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase'
  },
  stampSub: {
    color: '#1E3A8A',
    fontSize: 7,
    textTransform: 'uppercase',
    textAlign: 'center'
  },

  // --- FOOTER ---
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10
  },
  footerText: {
    fontSize: 7,
    color: COLORS.grey
  }
});

// Helper de formatage
const formatPrice = (amount: number) => {
  // Intl.NumberFormat ne marche pas toujours bien dans React-PDF selon les environnements
  // On fait un formatage manuel simple : 150000 -> 150 000
  return amount?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
};

export const RentReceiptPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* 1. FILIGRANE */}
      <View style={styles.watermarkContainer}>
         <Text style={styles.watermarkText}>ORIGINAL  IMMOFACILE</Text>
      </View>

      {/* 2. EN-TÊTE */}
      <View style={styles.header}>
        <View style={styles.logoBlock}>
            {/* Logo par défaut si pas d'image locale */}
            {/* <Image src="/logo.png" style={styles.logoImage} /> */}
            <View>
                <Text style={styles.titleBig}>Quittance</Text>
                <Text style={styles.subTitle}>De Loyer & Charges</Text>
            </View>
        </View>
        <View style={styles.refBlock}>
            <Text style={styles.refLabel}>Référence Unique</Text>
            <Text style={styles.refValue}>{data.reference}</Text>
            <Text style={[styles.refLabel, { marginTop: 5 }]}>Date d'émission</Text>
            <Text style={{ fontSize: 9 }}>{data.date}</Text>
        </View>
      </View>

      {/* 3. PARTIES PRENANTES */}
      <View style={styles.partiesContainer}>
         {/* Bailleur */}
         <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bailleur / Propriétaire</Text>
            <Text style={styles.partyName}>{data.ownerName}</Text>
            <Text style={styles.partyInfo}>Propriétaire du bien</Text>
            <Text style={styles.partyInfo}>Abidjan, Côte d'Ivoire</Text>
         </View>
         
         {/* Locataire */}
         <View style={styles.partyBox}>
            <Text style={[styles.partyLabel, { color: COLORS.accent }]}>Locataire</Text>
            <Text style={styles.partyName}>{data.tenantName}</Text>
            <Text style={styles.partyInfo}>{data.propertyAddress}</Text>
         </View>
      </View>

      {/* 4. BARRE D'INFO BIEN */}
      <View style={styles.infoBar}>
         <View style={styles.infoCol}>
            <Text style={styles.infoLabelInv}>Bien Loué</Text>
            <Text style={styles.infoTextInv}>{data.propertyAddress}</Text>
         </View>
         <View style={styles.infoColRight}>
            <Text style={styles.infoLabelInv}>Période du terme</Text>
            <Text style={styles.infoTextInv}>{data.period}</Text>
         </View>
      </View>

      {/* 5. TABLEAU COMPTABLE */}
      <View style={styles.table}>
         {/* TH */}
         <View style={styles.th}>
            <Text style={[styles.thText, styles.col1]}>Désignation</Text>
            <Text style={[styles.thText, styles.col2]}>Montant</Text>
         </View>

         {/* Loyer */}
         <View style={styles.tr}>
            <View style={styles.col1}>
                <Text style={[styles.tdText, { fontFamily: 'Helvetica-Bold' }]}>Loyer Mensuel</Text>
                <Text style={{ fontSize: 8, color: COLORS.grey }}>Loyer nu pour habitation</Text>
            </View>
            <Text style={[styles.tdText, styles.col2]}>{formatPrice(data.amount)}</Text>
         </View>

         {/* Charges (Simulé à 0 si pas de data) */}
         <View style={styles.tr}>
            <View style={styles.col1}>
                <Text style={styles.tdText}>Provisions sur charges</Text>
            </View>
            <Text style={[styles.tdText, styles.col2]}>0 FCFA</Text>
         </View>
      </View>

      {/* 6. TOTAUX */}
      <View style={{ width: '50%', alignSelf: 'flex-end' }}>
         <View style={styles.totalRow}>
             <Text style={styles.totalLabel}>Total Facturé</Text>
             <Text style={styles.totalValue}>{formatPrice(data.amount)}</Text>
         </View>
         
         {/* NET A PAYER (Ou Payé) */}
         <View style={styles.netToPay}>
             <Text style={styles.netLabel}>Total Payé</Text>
             <Text style={styles.netValue}>{formatPrice(data.amount)}</Text>
         </View>
      </View>

      {/* 7. BAS DE PAGE : JURIDIQUE & TAMPON */}
      <View style={styles.bottomSection}>
         <Text style={styles.legalText}>
            " Je soussigné, {data.ownerName}, propriétaire du logement désigné ci-dessus, déclare avoir reçu de M/Mme {data.tenantName} la somme indiquée au titre du loyer et des charges pour la période mentionnée. Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte. "
            {'\n\n'}
            Mode de règlement : Virement / Mobile Money
         </Text>

         {/* TAMPON ESTHÉTIQUE */}
         <View style={styles.stampContainer}>
             <Text style={styles.stampTitle}>PAYÉ</Text>
             <Text style={styles.stampSub}>Certifié Conforme</Text>
             <Text style={[styles.stampSub, { marginTop: 2 }]}>ImmoFacile CI</Text>
             <Text style={[styles.stampSub, { fontSize: 6, marginTop: 4 }]}>{data.date}</Text>
         </View>
      </View>

      {/* 8. FOOTER TECHNIQUE */}
      <View style={styles.footer}>
         <Text style={styles.footerText}>
            Document généré électroniquement par ImmoFacile • ID Transaction : {data.reference} • Valeur juridique probante
         </Text>
      </View>

    </Page>
  </Document>
);

export default RentReceiptPDF;
