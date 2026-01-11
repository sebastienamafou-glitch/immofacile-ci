"use client";
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Palette de couleurs inspirée de votre image
const COLORS = {
  orange: '#F59E0B', // Votre orange ImmoFacile
  dark: '#1F2937',
  grey: '#6B7280',
  lightGrey: '#F3F4F6',
  white: '#FFFFFF'
};

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: COLORS.dark 
  },
  
  // --- HEADER ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.orange,
    paddingBottom: 15
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  headerInfo: {
    textAlign: 'right',
    fontSize: 8,
    color: COLORS.grey
  },

  // --- TITRE ---
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  // --- BLOC INFO (BAILLEUR / LOCATAIRE) ---
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  infoColumn: {
    width: '45%'
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: COLORS.dark,
    marginBottom: 5
  },
  infoText: {
    fontSize: 10,
    marginBottom: 2,
    color: COLORS.grey
  },

  // --- TABLEAU ---
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.orange,
    padding: 8,
    alignItems: 'center'
  },
  th: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 9,
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA' // Léger gris pour le corps
  },
  td: {
    fontSize: 10,
    color: COLORS.dark
  },
  // Colonnes du tableau (Largeurs fixes)
  col1: { width: '50%' }, // Description
  col2: { width: '15%', textAlign: 'center' }, // Qté
  col3: { width: '17%', textAlign: 'right' }, // Prix
  col4: { width: '18%', textAlign: 'right' }, // Total

  // --- TOTAUX ---
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 0 // Collé au tableau
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGrey,
    padding: 10,
    width: '50%', // Prend la moitié droite
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 10
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 'black',
    color: COLORS.orange
  },

  // --- FOOTER & TAMPON ---
  footerSection: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  legalText: {
    fontSize: 8,
    color: COLORS.grey,
    width: '60%'
  },
  stampBox: {
    borderWidth: 2,
    borderColor: COLORS.dark,
    padding: 10,
    transform: 'rotate(-5deg)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stampText: {
    fontSize: 12,
    fontWeight: 'black',
    textTransform: 'uppercase'
  }
});

// Fonction utilitaire pour formater les prix avec espace (ex: 150 000)
const formatPrice = (amount: number) => {
  return Number(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const RentReceiptPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* 1. EN-TÊTE PRO */}
      <View style={styles.header}>
        <View style={styles.brandSection}>
            {/* Assurez-vous que logo.png est dans le dossier public */}
            <Image src="/logo.png" style={styles.logo} /> 
            <View>
              <Text style={styles.brandName}>IMMO<Text style={{ color: COLORS.orange }}>FACILE</Text></Text>
              <Text style={{ fontSize: 8, color: COLORS.grey }}>Gestion Immobilière Automatisée</Text>
            </View>
        </View>
        <View style={styles.headerInfo}>
            <Text style={{ fontWeight: 'bold', color: COLORS.dark }}>RÉFÉRENCE : {data.reference}</Text>
            <Text>Date d'émission : {data.date}</Text>
            <Text>Généré par ImmoFacile-CI</Text>
        </View>
      </View>

      {/* 2. TITRE */}
      <Text style={styles.title}>Quittance de Loyer</Text>

      {/* 3. INFO GRID (BAILLEUR / LOCATAIRE) */}
      <View style={styles.infoContainer}>
        <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>BAILLEUR :</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>{data.ownerName}</Text>
            <Text style={styles.infoText}>Propriétaire du bien</Text>
            <Text style={styles.infoText}>Abidjan, Côte d'Ivoire</Text>
        </View>

        <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>LOCATAIRE :</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 2 }}>{data.tenantName}</Text>
            <Text style={styles.infoText}>{data.propertyAddress}</Text>
            <Text style={styles.infoText}>Période : {data.period}</Text>
        </View>
      </View>

      {/* 4. TEXTE JURIDIQUE (Comme sur l'image) */}
      <Text style={{ fontSize: 9, color: COLORS.grey, marginBottom: 15, fontStyle: 'italic' }}>
        Pour valoir ce que de droit, cette quittance certifie le paiement complet du loyer et des charges pour la période indiquée ci-dessus.
      </Text>

      {/* 5. TABLEAU DE PAIEMENT */}
      <View>
        {/* Header Tableau */}
        <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>DÉSIGNATION</Text>
            <Text style={[styles.th, styles.col2]}>QTÉ</Text>
            <Text style={[styles.th, styles.col3]}>MONTANT</Text>
            <Text style={[styles.th, styles.col4]}>TOTAL</Text>
        </View>

        {/* Ligne 1 : Loyer */}
        <View style={styles.tableRow}>
            <View style={styles.col1}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Règlement de LOYER</Text>
                <Text style={{ fontSize: 8, color: COLORS.grey }}>Loyer mensuel - {data.period}</Text>
                <Text style={{ fontSize: 8, color: COLORS.grey }}>Bien : {data.propertyAddress}</Text>
            </View>
            <Text style={[styles.td, styles.col2]}>1</Text>
            <Text style={[styles.td, styles.col3]}>{formatPrice(data.amount)}</Text>
            <Text style={[styles.td, styles.col4]}>{formatPrice(data.amount)}</Text>
        </View>

        {/* Ligne Sous-Total (Optionnel, pour le style) */}
        <View style={[styles.tableRow, { borderBottomWidth: 0, paddingVertical: 5 }]}>
            <Text style={[styles.td, styles.col1]}></Text>
            <Text style={[styles.td, styles.col2]}></Text>
            <Text style={[styles.td, styles.col3, { fontSize: 8, color: COLORS.grey }]}>Sous-total</Text>
            <Text style={[styles.td, styles.col4, { fontSize: 8, color: COLORS.grey }]}>{formatPrice(data.amount)}</Text>
        </View>
      </View>

      {/* 6. TOTAL GÉNÉRAL (ENCADRÉ À DROITE) */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL PAYÉ (FCFA)</Text>
            <Text style={styles.totalValue}>{formatPrice(data.amount)}</Text>
        </View>
      </View>

      {/* 7. FOOTER ET TAMPON */}
      <View style={styles.footerSection}>
         <View style={{ width: '60%' }}>
            <Text style={styles.legalText}>
                Document généré électroniquement. En cas de questions, veuillez contacter votre gestionnaire.
            </Text>
            <Text style={[styles.legalText, { marginTop: 5 }]}>© 2026 ImmoFacile-CI</Text>
         </View>

         {/* Tampon style "Timbre" */}
         <View style={styles.stampBox}>
            <Text style={styles.stampText}>PAYÉ & CERTIFIÉ</Text>
            <Text style={{ fontSize: 8 }}>{data.date}</Text>
         </View>
      </View>

    </Page>
  </Document>
);

export default RentReceiptPDF;
