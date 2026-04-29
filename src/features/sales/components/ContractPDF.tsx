import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// --- TYPAGE STRICT DES DONNÉES DU CONTRAT ---
export interface ContractData {
  reference: string;
  date: string;
  price: number;
  property: {
    title: string;
    location: string;
    surface: number;
    legalStatus: string;
  };
  seller: {
    name: string | null;
    idType: string;
    idNumber: string;
    address: string;
  };
  buyer: {
    name: string | null;
    idType: string;
    idNumber: string;
    address: string;
  };
}

// --- FEUILLE DE STYLE PDF ---
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1e293b' },
  header: { textAlign: 'center', marginBottom: 30 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  subtitle: { fontSize: 10, color: '#64748b' },
  refBox: { backgroundColor: '#f8fafc', padding: 10, border: '1pt solid #e2e8f0', marginBottom: 30 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ea580c', borderBottom: '1pt solid #ea580c', paddingBottom: 5, marginTop: 20, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  column: { width: '48%', padding: 10, border: '1pt solid #e2e8f0' },
  columnHeader: { backgroundColor: '#0f172a', color: '#ffffff', padding: 5, fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 10 },
  text: { marginBottom: 5, lineHeight: 1.5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  priceBox: { backgroundColor: '#fff7ed', border: '1pt solid #fdba74', padding: 15, textAlign: 'center', marginVertical: 15 },
  priceText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#c2410c' },
  footer: { marginTop: 40, fontSize: 8, color: '#94a3b8', textAlign: 'center', borderTop: '1pt solid #e2e8f0', paddingTop: 10 },
  signatureBox: { height: 80, border: '1pt dashed #cbd5e1', marginTop: 10 }
});

// --- LE COMPOSANT PDF ---
export const ContractPDF = ({ data }: { data: ContractData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>PROMESSE SYNALLAGMATIQUE DE VENTE</Text>
        <Text style={styles.subtitle}>(Compromis de Vente sous seing privé)</Text>
      </View>

      <View style={styles.refBox}>
        <Text style={styles.bold}>RÉFÉRENCE DOSSIER : {data.reference}</Text>
      </View>

      {/* Les Parties */}
      <View>
        <Text style={styles.sectionTitle}>1. IDENTIFICATION DES PARTIES</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.columnHeader}>LE VENDEUR</Text>
            <Text style={styles.text}><Text style={styles.bold}>Nom :</Text> {data.seller.name || 'Non renseigné'}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Identité :</Text> {data.seller.idType} n° {data.seller.idNumber}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Domicile :</Text> {data.seller.address}</Text>
          </View>
          <View style={styles.column}>
            <Text style={styles.columnHeader}>L'ACQUÉREUR</Text>
            <Text style={styles.text}><Text style={styles.bold}>Nom :</Text> {data.buyer.name || 'Non renseigné'}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Identité :</Text> {data.buyer.idType} n° {data.buyer.idNumber}</Text>
            <Text style={styles.text}><Text style={styles.bold}>Domicile :</Text> {data.buyer.address}</Text>
          </View>
        </View>
      </View>

      {/* Le Bien */}
      <View>
        <Text style={styles.sectionTitle}>2. DÉSIGNATION DU BIEN</Text>
        <Text style={styles.text}>Le Vendeur s'engage à vendre à l'Acquéreur, qui accepte, le bien immobilier désigné ci-après :</Text>
        <Text style={styles.text}>• <Text style={styles.bold}>Nature du bien :</Text> {data.property.title}</Text>
        <Text style={styles.text}>• <Text style={styles.bold}>Localisation :</Text> {data.property.location}</Text>
        <Text style={styles.text}>• <Text style={styles.bold}>Contenance :</Text> {data.property.surface} m²</Text>
        <Text style={styles.text}>• <Text style={styles.bold}>Statut Juridique :</Text> {data.property.legalStatus.replace('_', ' ')}</Text>
      </View>

      {/* Conditions Financières */}
      <View>
        <Text style={styles.sectionTitle}>3. CONDITIONS FINANCIÈRES</Text>
        <Text style={styles.text}>La présente vente est consentie et acceptée moyennant le prix principal de :</Text>
        <View style={styles.priceBox}>
          <Text style={styles.priceText}>{data.price.toLocaleString()} FCFA</Text>
        </View>
        <Text style={[styles.text, { fontSize: 9, color: '#64748b' }]}>
          Ce montant correspond au prix net vendeur et ne comprend pas les frais d'acquisition (notaire, droits d'enregistrement) qui sont à la charge de l'Acquéreur.
        </Text>
      </View>

      {/* Signatures */}
      <View style={{ marginTop: 20 }}>
        <Text style={styles.sectionTitle}>4. SIGNATURES</Text>
        <Text style={styles.text}>Fait à Abidjan, le {data.date}.</Text>
        <View style={styles.row}>
          <View style={{ width: '45%', textAlign: 'center' }}>
            <Text style={styles.bold}>LE VENDEUR</Text>
            <View style={styles.signatureBox}></View>
          </View>
          <View style={{ width: '45%', textAlign: 'center' }}>
            <Text style={styles.bold}>L'ACQUÉREUR</Text>
            <View style={styles.signatureBox}></View>
          </View>
        </View>
      </View>

      {/* Pied de page */}
      <Text style={styles.footer} fixed>
        Document généré automatiquement par BABIMMO.CI. Certifié conforme aux informations KYC.
      </Text>
    </Page>
  </Document>
);
