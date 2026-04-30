import { 
    PrismaClient, 
    Role, 
    VerificationStatus, 
    PropertyType, 
    LeaseStatus, 
    MissionType, 
    MissionStatus,
    IncidentStatus, 
    BookingStatus,
    PaymentProvider,
    PaymentStatus,
    PaymentType,
    InvestmentStatus,
    InvestmentPack,
    MandateStatus,
    SignatureStatus,
    IvorianLegalStatus,
    SaleTransactionStep,
    ApplicationStatus,
    QuoteStatus
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Mega-Seed Demo Prospect"...');

  // ==========================================
  // 1. NETTOYAGE INTÉGRAL (Ordre strict des clés étrangères)
  // ==========================================
  console.log('🧹 Vidage de la base de données...');
  
  await prisma.processedWebhook.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.message.deleteMany();
  await prisma.signatureProof.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingPayment.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.investmentContract.deleteMany();
  await prisma.rentSchedule.deleteMany();
  await prisma.lease.deleteMany(); 
  await prisma.listing.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.agencyTransaction.deleteMany();
  await prisma.application.deleteMany();
  await prisma.managementMandate.deleteMany();
  await prisma.saleOffer.deleteMany();
  await prisma.propertyForSale.deleteMany();
  await prisma.property.deleteMany();
  await prisma.userFinance.deleteMany();
  await prisma.userKYC.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  // ⚠️ MOT DE PASSE UNIQUE POUR TOUS LES COMPTES : password123
  const password = await hash('password123', 12);

  // ==========================================
  // 2. CRÉATION DE L'AGENCE (Tenant Principal)
  // ==========================================
  const agency = await prisma.agency.create({
    data: {
      name: "Immo Prestige Abidjan",
      slug: 'immo-prestige',
      code: 'IMMO-PRESTIGE',
      email: "contact@immoprestige.ci",
      phone: "+225 0707070707",
      primaryColor: '#F59E0B',
      isActive: true,
      taxId: 'CC-1234567-X',
      logoUrl: 'https://placehold.co/400x400/0f172a/white?text=IP',
      defaultCommissionRate: 0.10,
      walletBalance: 2500000
    }
  });

  // ==========================================
  // 3. UTILISATEURS & ROLES (Couverture 100%)
  // ==========================================
  console.log('👤 Création des profils utilisateurs...');

  const usersData = [
    { email: 'admin@babimmo.ci', name: 'Super Admin Babimmo', role: Role.SUPER_ADMIN, agencyId: null },
    { email: 'pierre@immoprestige.ci', name: 'Pierre (Dir. Agence)', role: Role.AGENCY_ADMIN, agencyId: agency.id },
    { email: 'jean@immoprestige.ci', name: 'Jean (Agent Terrain)', role: Role.AGENT, agencyId: agency.id },
    { email: 'sophie@gmail.com', name: 'Sophie (Proprio Solo)', role: Role.OWNER, agencyId: null },
    { email: 'kouassi@gmail.com', name: 'M. Kouassi (Proprio Agence)', role: Role.OWNER, agencyId: agency.id },
    { email: 'nouveau@gmail.com', name: 'Marie (Locataire Active)', role: Role.TENANT, agencyId: agency.id },
    { email: 'candidat@gmail.com', name: 'Paul (Candidat Locataire)', role: Role.TENANT, agencyId: null },
    { email: 'voyageur@test.com', name: 'Marc (Voyageur Akwaba)', role: Role.GUEST, agencyId: null },
    { email: 'artisan@babimmo.ci', name: 'Expert Plomberie', role: Role.ARTISAN, agencyId: null },
    { email: 'investisseur@gmail.com', name: 'Gilles (Investisseur)', role: Role.INVESTOR, agencyId: null },
    { email: 'acheteur@gmail.com', name: 'Awa (Acheteuse Foncier)', role: Role.TENANT, agencyId: null },
    { email: 'ambassadeur@babimmo.ci', name: 'Influenceur Immo', role: Role.AMBASSADOR, agencyId: null }
  ];

  const usersMap: Record<string, any> = {};

  for (const u of usersData) {
    const isOwnerOrInvestor = u.role === Role.OWNER || u.role === Role.INVESTOR;
    const isAmbassador = u.role === Role.AMBASSADOR;

    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        agencyId: u.agencyId,
        password,
        isVerified: true,
        phone: `+22507${Math.floor(10000000 + Math.random() * 90000000)}`,
        finance: { 
            create: { 
                walletBalance: isOwnerOrInvestor ? 5000000 : 0,
                referralBalance: isAmbassador ? 150000 : 0,
                kycTier: 3, 
                version: 1
            } 
        },
        kyc: { 
            create: { 
                status: VerificationStatus.VERIFIED, 
                idType: "CNI", 
                idNumber: `CI-${Math.floor(Math.random() * 1000000)}`, 
                documents: [] 
            } 
        }
      }
    });
    usersMap[u.email] = user;
  }

  // ==========================================
  // 4. MANDATS DE GESTION & LOCATIONS LONGUES
  // ==========================================
  console.log('🏠 Configuration des Mandats et Baux...');

  const villa = await prisma.property.create({
    data: {
      title: "Villa Emeraude avec Piscine",
      type: PropertyType.VILLA,
      address: "Riviera 3, Abidjan",
      commune: "Cocody",
      price: 1500000,
      bedrooms: 4,
      bathrooms: 3,
      surface: 250,
      ownerId: usersMap['kouassi@gmail.com'].id,
      agencyId: agency.id,
      agentId: usersMap['jean@immoprestige.ci'].id,
      isPublished: true, 
      images: ['https://placehold.co/800x600/1e293b/white?text=Villa+Emeraude'],
    }
  });

  // Création du Mandat de gestion
  await prisma.managementMandate.create({
      data: {
          propertyId: villa.id,
          ownerId: usersMap['kouassi@gmail.com'].id,
          agencyId: agency.id,
          commissionRate: 8.5,
          status: MandateStatus.ACTIVE,
          signatureStatus: SignatureStatus.COMPLETED
      }
  });

  // Création du Bail
  const lease = await prisma.lease.create({
    data: {
      propertyId: villa.id,
      tenantId: usersMap['nouveau@gmail.com'].id,
      agentId: usersMap['jean@immoprestige.ci'].id,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      monthlyRent: 1500000, 
      depositAmount: 3000000,
      advanceAmount: 1500000, 
      status: LeaseStatus.ACTIVE,
      isActive: true,
      agencyCommissionRate: 8.5,
      signatureStatus: SignatureStatus.COMPLETED
    }
  });

  // Candidature en attente sur un autre bien
  const appartement = await prisma.property.create({
      data: {
          title: "Appartement F4 Angré",
          type: PropertyType.APPARTEMENT,
          address: "8ème Tranche",
          commune: "Cocody",
          price: 450000,
          bedrooms: 3,
          bathrooms: 2,
          ownerId: usersMap['sophie@gmail.com'].id,
          isPublished: true,
      }
  });

  await prisma.application.create({
      data: {
          propertyId: appartement.id,
          applicantId: usersMap['candidat@gmail.com'].id,
          status: ApplicationStatus.REVIEWING,
          message: "Je suis très intéressé par cet appartement. Mon dossier est complet."
      }
  });

  // ==========================================
  // 5. MODULE VENTE & FONCIER (Nouveau !)
  // ==========================================
  console.log('🏗️ Initialisation du module de Vente & Foncier...');

  const terrain = await prisma.propertyForSale.create({
      data: {
          title: "Terrain 500m² avec ACD",
          description: "Superbe terrain plat situé dans une zone en plein développement. Idéal pour promotion immobilière.",
          priceCfa: 25000000,
          surfaceArea: 500,
          location: "Bingerville, Nouveau Camp",
          legalStatus: IvorianLegalStatus.ACD,
          status: SaleTransactionStep.OFFER_PENDING,
          ownerId: usersMap['kouassi@gmail.com'].id,
          images: ['https://placehold.co/800x600/047857/white?text=Terrain+ACD'],
      }
  });

  await prisma.saleOffer.create({
      data: {
          propertyId: terrain.id,
          buyerId: usersMap['acheteur@gmail.com'].id,
          amountCfa: 23500000,
          status: QuoteStatus.PENDING
      }
  });

  // ==========================================
  // 6. MODULE AKWABA (Locations Courtes & Avis)
  // ==========================================
  console.log('🌴 Configuration du module Akwaba et interactions...');

  const listing = await prisma.listing.create({
    data: {
      title: "Studio Cosy Plateau",
      description: "Magnifique studio avec vue sur la lagune.",
      pricePerNight: 35000,
      address: "Rue du Commerce",
      city: "Abidjan",
      neighborhood: "Plateau",
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      isPublished: true,
      hostId: usersMap['sophie@gmail.com'].id, 
      images: ['https://placehold.co/800x600/0f172a/white?text=Studio+Plateau'],
      amenities: ["WiFi", "Climatisation", "TV 4K"],
    }
  });

  await prisma.review.create({
      data: {
          rating: 5,
          comment: "Séjour incroyable ! La vue est à couper le souffle et Sophie est très réactive.",
          listingId: listing.id,
          authorId: usersMap['voyageur@test.com'].id
      }
  });

  // ==========================================
  // 7. VIE DE LA PLATEFORME (Messages & Notifs)
  // ==========================================
  const conv = await prisma.conversation.create({
      data: {
          guestId: usersMap['voyageur@test.com'].id,
          hostId: usersMap['sophie@gmail.com'].id,
          listingId: listing.id
      }
  });

  await prisma.message.createMany({
      data: [
          { conversationId: conv.id, senderId: usersMap['voyageur@test.com'].id, content: "Bonjour, le studio est-il dispo ce weekend ?" },
          { conversationId: conv.id, senderId: usersMap['sophie@gmail.com'].id, content: "Bonjour Marc, oui tout à fait ! Je vous attends." }
      ]
  });

  await prisma.notification.createMany({
      data: [
          { userId: usersMap['kouassi@gmail.com'].id, title: "Nouvelle offre d'achat", message: "Awa a fait une offre de 23,500,000 FCFA pour votre terrain.", type: "ALERT", isRead: false },
          { userId: usersMap['sophie@gmail.com'].id, title: "Nouveau message", message: "Marc vous a envoyé un message concernant le Studio Plateau.", type: "INFO", isRead: true }
      ]
  });

  console.log('✅ Mega-Seed terminé avec succès ! Ton dashboard va être incroyable. 🚀');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
