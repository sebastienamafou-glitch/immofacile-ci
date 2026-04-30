import {
  PrismaClient,
  Role,
  VerificationStatus,
  PropertyType,
  LeaseStatus,
  MissionType,
  MissionStatus,
  IncidentStatus,
  IncidentPriority,
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
  QuoteStatus,
  RentStatus,
  TransactionType,
  BalanceType,
  TransactionStatus,
  AuditAction,
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed DEMO — CORAIL IMMOBILIER...');

  // ==========================================
  // 1. NETTOYAGE INTÉGRAL
  // ==========================================
  console.log('🧹 Nettoyage de la base...');
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

  // Mot de passe unique : password123
  const password = await hash('password123', 12);

  // ==========================================
  // 2. AGENCE : CORAIL IMMOBILIER
  // ==========================================
  console.log('🏢 Création de CORAIL IMMOBILIER...');
  const agency = await prisma.agency.create({
    data: {
      name: 'CORAIL IMMOBILIER',
      slug: 'corail-immobilier',
      code: 'CORAIL-CI',
      email: 'contact@corailimmobilier.ci',
      phone: '+225 0101010101',
      primaryColor: '#E63946', // Rouge corail
      isActive: true,
      taxId: 'CC-9876543-A',
      logoUrl: 'https://placehold.co/400x400/E63946/white?text=CI',
      defaultCommissionRate: 0.10,
      walletBalance: 4_750_000,
    },
  });

  // ==========================================
  // 3. UTILISATEURS
  // ==========================================
  console.log('👤 Création des utilisateurs...');

  const usersData = [
    // Super Admin plateforme (vous)
    { email: 'admin@babimmo.ci',         name: 'Super Admin BabImmo',           role: Role.SUPER_ADMIN,    agencyId: null,       wallet: 0,         isOwner: false },
    // Direction CORAIL (Aminata — votre prospect !)
    { email: 'aminata@corailimmobilier.ci', name: 'Aminata Diomandé (Dir. Agence)', role: Role.AGENCY_ADMIN, agencyId: agency.id, wallet: 0,         isOwner: false },
    // Agents terrain
    { email: 'koffi@corailimmobilier.ci',  name: 'Koffi Assoumou (Agent Senior)',  role: Role.AGENT,         agencyId: agency.id, wallet: 0,         isOwner: false },
    { email: 'fatou@corailimmobilier.ci',  name: 'Fatoumata Bah (Agent Junior)',   role: Role.AGENT,         agencyId: agency.id, wallet: 0,         isOwner: false },
    // Propriétaires
    { email: 'traore.moussa@gmail.com',    name: 'M. Traoré (Propriétaire VIP)',   role: Role.OWNER,         agencyId: agency.id, wallet: 8_500_000, isOwner: true  },
    { email: 'effi.epse@gmail.com',        name: 'Mme Effi Epse Brou',            role: Role.OWNER,         agencyId: null,      wallet: 3_200_000, isOwner: true  },
    { email: 'dago.holdings@gmail.com',    name: 'DAGO Holdings (Multi-biens)',    role: Role.OWNER,         agencyId: agency.id, wallet: 12_000_000,isOwner: true  },
    // Locataires actifs
    { email: 'yao.kouame@gmail.com',       name: 'Yao Kouamé (Locataire Actif)',   role: Role.TENANT,        agencyId: agency.id, wallet: 0,         isOwner: false },
    { email: 'isabelle.n@gmail.com',       name: 'Isabelle Ndiaye (Locataire)',    role: Role.TENANT,        agencyId: agency.id, wallet: 0,         isOwner: false },
    // Candidats en attente
    { email: 'candidat.alpha@gmail.com',   name: 'Alpha Camara (Candidat)',        role: Role.TENANT,        agencyId: null,      wallet: 0,         isOwner: false },
    { email: 'candidat.binta@gmail.com',   name: 'Binta Koné (Candidate)',         role: Role.TENANT,        agencyId: null,      wallet: 0,         isOwner: false },
    // Voyageurs Akwaba
    { email: 'voyageur.paris@gmail.com',   name: 'Pierre-Yves (Voyageur Paris)',   role: Role.GUEST,         agencyId: null,      wallet: 0,         isOwner: false },
    { email: 'voyage.dakar@gmail.com',     name: 'Rokhaya Diallo (Dakar)',         role: Role.GUEST,         agencyId: null,      wallet: 0,         isOwner: false },
    // Artisan
    { email: 'artisan.plomb@babimmo.ci',   name: 'Christian Aka (Plombier Certifié)', role: Role.ARTISAN,    agencyId: null,      wallet: 0,         isOwner: false },
    // Investisseur
    { email: 'invest.abidjan@gmail.com',   name: 'Dr. Coulibaly (Investisseur)',   role: Role.INVESTOR,      agencyId: null,      wallet: 15_000_000,isOwner: false },
    // Acheteur foncier
    { email: 'acheteur.terrain@gmail.com', name: 'Rose Adjoumani (Acheteuse)',     role: Role.TENANT,        agencyId: null,      wallet: 0,         isOwner: false },
    // Ambassadeur
    { email: 'influence.immo@gmail.com',   name: 'ImmoInfluence CI (Ambassadeur)',  role: Role.AMBASSADOR,   agencyId: null,      wallet: 0,         isOwner: false },
  ];

  const u: Record<string, any> = {};

  for (const d of usersData) {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        name: d.name,
        role: d.role,
        agencyId: d.agencyId,
        password,
        isVerified: true,
        phone: `+2250${Math.floor(100000000 + Math.random() * 900000000)}`,
        finance: {
          create: {
            walletBalance: d.wallet,
            referralBalance: d.role === Role.AMBASSADOR ? 250_000 : 0,
            kycTier: 3,
            version: 1,
          },
        },
        kyc: {
          create: {
            status: VerificationStatus.VERIFIED,
            idType: 'CNI',
            idNumber: `CI-${Math.floor(100000 + Math.random() * 900000)}`,
            documents: [],
          },
        },
      },
    });
    u[d.email] = user;
  }

  // ==========================================
  // 4. BIENS IMMOBILIERS (Portfolio Corail)
  // ==========================================
  console.log('🏠 Création du portfolio de biens...');

  // --- Villa VIP Cocody (Mandat actif + Bail actif)
  const villaVIP = await prisma.property.create({
    data: {
      title: 'Villa Prestige 5 ch. – Cocody Ambassades',
      type: PropertyType.VILLA,
      address: 'Rue des Ambassades, Résidence Les Palmiers',
      commune: 'Cocody',
      price: 2_500_000,
      bedrooms: 5,
      bathrooms: 4,
      surface: 380,
      ownerId: u['traore.moussa@gmail.com'].id,
      agencyId: agency.id,
      agentId: u['koffi@corailimmobilier.ci'].id,
      isPublished: true,
      views: 247,
      images: ['https://placehold.co/800x600/1e293b/white?text=Villa+Prestige+Ambassades'],
    },
  });

  // --- Appartement F3 Marcory (Mandat actif + Candidatures)
  const apptMarcory = await prisma.property.create({
    data: {
      title: 'Appartement F3 – Marcory Zone 4',
      type: PropertyType.APPARTEMENT,
      address: 'Immeuble Soleil Levant, 3ème étage',
      commune: 'Marcory',
      price: 350_000,
      bedrooms: 3,
      bathrooms: 2,
      surface: 85,
      ownerId: u['effi.epse@gmail.com'].id,
      agencyId: agency.id,
      agentId: u['fatou@corailimmobilier.ci'].id,
      isPublished: true,
      views: 189,
      images: ['https://placehold.co/800x600/0f172a/white?text=Appt+Marcory+F3'],
    },
  });

  // --- Immeuble de rapport DAGO (Multi-biens)
  const immeubleAngre = await prisma.property.create({
    data: {
      title: 'Appartement F4 – Angré 8ème Tranche',
      type: PropertyType.APPARTEMENT,
      address: '8ème Tranche, Cité SOGEFIA',
      commune: 'Cocody',
      price: 480_000,
      bedrooms: 4,
      bathrooms: 2,
      surface: 120,
      ownerId: u['dago.holdings@gmail.com'].id,
      agencyId: agency.id,
      agentId: u['koffi@corailimmobilier.ci'].id,
      isPublished: true,
      views: 312,
      images: ['https://placehold.co/800x600/064e3b/white?text=Appt+Angre+F4'],
    },
  });

  const bureauPlateau = await prisma.property.create({
    data: {
      title: 'Bureau 80m² – Plateau Centre',
      type: PropertyType.BUREAU,
      address: 'Avenue Houphouët-Boigny, Imm. Caisse',
      commune: 'Plateau',
      price: 900_000,
      bedrooms: 0,
      bathrooms: 2,
      surface: 80,
      ownerId: u['dago.holdings@gmail.com'].id,
      agencyId: agency.id,
      agentId: u['fatou@corailimmobilier.ci'].id,
      isPublished: true,
      views: 98,
      images: ['https://placehold.co/800x600/1e3a5f/white?text=Bureau+Plateau'],
    },
  });

  const magasinAdjame = await prisma.property.create({
    data: {
      title: 'Magasin 120m² – Adjamé Commerce',
      type: PropertyType.MAGASIN,
      address: 'Rue du Commerce, Marché Adjamé',
      commune: 'Adjamé',
      price: 600_000,
      bedrooms: 0,
      bathrooms: 1,
      surface: 120,
      ownerId: u['traore.moussa@gmail.com'].id,
      agencyId: agency.id,
      agentId: u['koffi@corailimmobilier.ci'].id,
      isPublished: true,
      views: 56,
      images: ['https://placehold.co/800x600/7c2d12/white?text=Magasin+Adjame'],
    },
  });

  // ==========================================
  // 5. MANDATS DE GESTION
  // ==========================================
  console.log('📋 Création des mandats de gestion...');

  await prisma.managementMandate.createMany({
    data: [
      {
        propertyId: villaVIP.id,
        ownerId: u['traore.moussa@gmail.com'].id,
        agencyId: agency.id,
        commissionRate: 9.0,
        status: MandateStatus.ACTIVE,
        signatureStatus: SignatureStatus.COMPLETED,
      },
      {
        propertyId: apptMarcory.id,
        ownerId: u['effi.epse@gmail.com'].id,
        agencyId: agency.id,
        commissionRate: 8.5,
        status: MandateStatus.ACTIVE,
        signatureStatus: SignatureStatus.COMPLETED,
      },
      {
        propertyId: immeubleAngre.id,
        ownerId: u['dago.holdings@gmail.com'].id,
        agencyId: agency.id,
        commissionRate: 8.0,
        status: MandateStatus.ACTIVE,
        signatureStatus: SignatureStatus.COMPLETED,
      },
      {
        propertyId: bureauPlateau.id,
        ownerId: u['dago.holdings@gmail.com'].id,
        agencyId: agency.id,
        commissionRate: 8.0,
        status: MandateStatus.ACTIVE,
        signatureStatus: SignatureStatus.COMPLETED,
      },
      {
        propertyId: magasinAdjame.id,
        ownerId: u['traore.moussa@gmail.com'].id,
        agencyId: agency.id,
        commissionRate: 7.5,
        status: MandateStatus.PENDING,
        signatureStatus: SignatureStatus.SIGNED_OWNER,
      },
    ],
  });

  // ==========================================
  // 6. BAUX ACTIFS + LOYERS HISTORIQUES
  // ==========================================
  console.log('📄 Création des baux et échéanciers...');

  const leaseVillaVIP = await prisma.lease.create({
    data: {
      propertyId: villaVIP.id,
      tenantId: u['yao.kouame@gmail.com'].id,
      agentId: u['koffi@corailimmobilier.ci'].id,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-06-01'),
      monthlyRent: 2_500_000,
      depositAmount: 5_000_000,
      advanceAmount: 2_500_000,
      status: LeaseStatus.ACTIVE,
      isActive: true,
      agencyCommissionRate: 9.0,
      signatureStatus: SignatureStatus.COMPLETED,
      tenantLeasingFee: 2_500_000,
      ownerLeasingFee: 2_500_000,
    },
  });

  const leaseApptMarcory = await prisma.lease.create({
    data: {
      propertyId: apptMarcory.id,
      tenantId: u['isabelle.n@gmail.com'].id,
      agentId: u['fatou@corailimmobilier.ci'].id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-09-01'),
      monthlyRent: 350_000,
      depositAmount: 700_000,
      advanceAmount: 350_000,
      status: LeaseStatus.ACTIVE,
      isActive: true,
      agencyCommissionRate: 8.5,
      signatureStatus: SignatureStatus.COMPLETED,
      tenantLeasingFee: 350_000,
      ownerLeasingFee: 350_000,
    },
  });

  const leaseBureau = await prisma.lease.create({
    data: {
      propertyId: bureauPlateau.id,
      tenantId: u['dago.holdings@gmail.com'].id, // DAGO loue aussi à un tiers (simplifié)
      agentId: u['fatou@corailimmobilier.ci'].id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-01-01'),
      monthlyRent: 900_000,
      depositAmount: 1_800_000,
      advanceAmount: 900_000,
      status: LeaseStatus.IN_NOTICE,
      isActive: true,
      agencyCommissionRate: 8.0,
      signatureStatus: SignatureStatus.COMPLETED,
      noticeGivenAt: new Date('2025-03-01'),
      plannedDepartureDate: new Date('2025-05-31'),
      tenantLeasingFee: 900_000,
      ownerLeasingFee: 900_000,
    },
  });

  // Échéanciers de loyer (6 derniers mois pour la villa VIP)
  const months = [
    { date: new Date('2024-11-01'), status: RentStatus.PAID },
    { date: new Date('2024-12-01'), status: RentStatus.PAID },
    { date: new Date('2025-01-01'), status: RentStatus.PAID },
    { date: new Date('2025-02-01'), status: RentStatus.PAID },
    { date: new Date('2025-03-01'), status: RentStatus.LATE },
    { date: new Date('2025-04-01'), status: RentStatus.PENDING },
    { date: new Date('2025-05-01'), status: RentStatus.PENDING },
  ];

  for (const m of months) {
    await prisma.rentSchedule.create({
      data: {
        leaseId: leaseVillaVIP.id,
        expectedDate: m.date,
        amount: 2_500_000,
        status: m.status,
        paidAt: m.status === RentStatus.PAID ? new Date(m.date.getTime() + 86400000 * 2) : null,
      },
    });
  }

  // Loyers pour Marcory (tous payés à jour)
  for (let i = 9; i <= 12; i++) {
    await prisma.rentSchedule.create({
      data: {
        leaseId: leaseApptMarcory.id,
        expectedDate: new Date(`2024-${String(i).padStart(2, '0')}-01`),
        amount: 350_000,
        status: RentStatus.PAID,
        paidAt: new Date(`2024-${String(i).padStart(2, '0')}-05`),
      },
    });
  }
  for (let i = 1; i <= 4; i++) {
    await prisma.rentSchedule.create({
      data: {
        leaseId: leaseApptMarcory.id,
        expectedDate: new Date(`2025-${String(i).padStart(2, '0')}-01`),
        amount: 350_000,
        status: i <= 3 ? RentStatus.PAID : RentStatus.PENDING,
        paidAt: i <= 3 ? new Date(`2025-${String(i).padStart(2, '0')}-04`) : null,
      },
    });
  }

  // ==========================================
  // 7. CANDIDATURES EN COURS (Bien Angré)
  // ==========================================
  console.log('📝 Création des candidatures locataires...');
  await prisma.application.createMany({
    data: [
      {
        propertyId: immeubleAngre.id,
        applicantId: u['candidat.alpha@gmail.com'].id,
        status: ApplicationStatus.REVIEWING,
        message: "Salarié CDI chez Orange CI, 3 ans d'ancienneté, dossier complet. Disponible immédiatement.",
        documents: ['https://placehold.co/200x300/0f172a/white?text=CNI', 'https://placehold.co/200x300/0f172a/white?text=Fiche+Paie'],
      },
      {
        propertyId: immeubleAngre.id,
        applicantId: u['candidat.binta@gmail.com'].id,
        status: ApplicationStatus.PENDING,
        message: 'Fonctionnaire au Ministère de l\'Éducation. Je cherche un logement stable pour ma famille.',
        documents: ['https://placehold.co/200x300/0f172a/white?text=CNI'],
      },
    ],
  });

  // ==========================================
  // 8. MISSIONS TERRAIN
  // ==========================================
  console.log('🚗 Création des missions agents...');
  await prisma.mission.createMany({
    data: [
      {
        propertyId: immeubleAngre.id,
        agentId: u['koffi@corailimmobilier.ci'].id,
        type: MissionType.VISITE,
        status: MissionStatus.ACCEPTED,
        fee: 25_000,
        dateScheduled: new Date('2025-05-05T10:00:00'),
      },
      {
        propertyId: apptMarcory.id,
        agentId: u['fatou@corailimmobilier.ci'].id,
        type: MissionType.ETAT_DES_LIEUX_ENTREE,
        status: MissionStatus.COMPLETED,
        fee: 50_000,
        dateScheduled: new Date('2024-09-01T09:00:00'),
      },
      {
        propertyId: bureauPlateau.id,
        agentId: u['koffi@corailimmobilier.ci'].id,
        type: MissionType.ETAT_DES_LIEUX_SORTIE,
        status: MissionStatus.PENDING,
        fee: 75_000,
        dateScheduled: new Date('2025-05-28T14:00:00'),
      },
      {
        propertyId: villaVIP.id,
        agentId: u['fatou@corailimmobilier.ci'].id,
        type: MissionType.PHOTOS,
        status: MissionStatus.COMPLETED,
        fee: 30_000,
        dateScheduled: new Date('2024-05-20T08:00:00'),
      },
    ],
  });

  // ==========================================
  // 9. INCIDENTS & DEVIS ARTISAN
  // ==========================================
  console.log('🔧 Création des incidents et devis...');

  const incidentPlomberie = await prisma.incident.create({
    data: {
      title: 'Fuite importante sous évier cuisine',
      description: 'Le locataire signale une fuite active sous l\'évier de la cuisine causant des dégâts sur le meuble bas. Intervention urgente nécessaire.',
      priority: IncidentPriority.HIGH,
      status: IncidentStatus.QUOTATION,
      photos: ['https://placehold.co/400x300/dc2626/white?text=Fuite+Cuisine'],
      photosBefore: [],
      photosAfter: [],
      reporterId: u['yao.kouame@gmail.com'].id,
      assignedToId: u['artisan.plomb@babimmo.ci'].id,
      propertyId: villaVIP.id,
    },
  });

  const incidentElec = await prisma.incident.create({
    data: {
      title: 'Panne électrique – Salon et chambres',
      description: 'Plusieurs prises du salon et des chambres ne fonctionnent plus depuis hier soir. Probable disjoncteur défaillant.',
      priority: IncidentPriority.NORMAL,
      status: IncidentStatus.IN_PROGRESS,
      photos: [],
      photosBefore: [],
      photosAfter: [],
      reporterId: u['isabelle.n@gmail.com'].id,
      assignedToId: u['artisan.plomb@babimmo.ci'].id,
      propertyId: apptMarcory.id,
    },
  });

  // Devis pour l'incident plomberie
  const devisPlomberie = await prisma.quote.create({
    data: {
      number: 'DEV-2025-0042',
      status: QuoteStatus.PENDING,
      totalNet: 85_000,
      taxAmount: 15_300,
      totalAmount: 100_300,
      validityDate: new Date('2025-05-15'),
      notes: 'Remplacement siphon + joint + flexible alimentation. Délai d\'intervention : 48h.',
      incidentId: incidentPlomberie.id,
      artisanId: u['artisan.plomb@babimmo.ci'].id,
      items: {
        create: [
          { description: 'Main d\'œuvre plombier (2h)', quantity: 2, unitPrice: 15_000, total: 30_000 },
          { description: 'Siphon cuisine PVC', quantity: 1, unitPrice: 12_000, total: 12_000 },
          { description: 'Flexible alimentation + joint', quantity: 2, unitPrice: 8_500, total: 17_000 },
          { description: 'Déplacement & fournitures diverses', quantity: 1, unitPrice: 26_000, total: 26_000 },
        ],
      },
    },
  });

  // ==========================================
  // 10. MODULE AKWABA (Locations Courtes Durées)
  // ==========================================
  console.log('🌴 Configuration du module Akwaba...');

  const studioAkwaba = await prisma.listing.create({
    data: {
      title: 'Suite Exécutive – Plateau Lagune View',
      description: 'Suite meublée haut de gamme avec vue panoramique sur la lagune Ébrié. Idéale pour cadres expatriés et voyageurs d\'affaires.',
      pricePerNight: 65_000,
      address: 'Boulevard de la République',
      city: 'Abidjan',
      neighborhood: 'Plateau',
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      isPublished: true,
      hostId: u['dago.holdings@gmail.com'].id,
      agencyId: agency.id,
      propertyId: null,
      amenities: ['WiFi Fibre', 'Clim Multi-split', 'TV 65" 4K', 'Cuisine équipée', 'Parking sécurisé', 'Générateur'],
      images: ['https://placehold.co/800x600/0f172a/white?text=Suite+Plateau+Lagune'],
    },
  });

  const villaAkwaba = await prisma.listing.create({
    data: {
      title: 'Villa Piscine 4 ch. – Riviera Golf',
      description: 'Villa luxueuse en résidence fermée. Piscine privée, jardin tropical, personnel inclus. Parfaite pour séjours famille ou team building.',
      pricePerNight: 250_000,
      address: 'Résidence Riviera Golf',
      city: 'Abidjan',
      neighborhood: 'Riviera',
      maxGuests: 8,
      bedrooms: 4,
      bathrooms: 3,
      isPublished: true,
      hostId: u['traore.moussa@gmail.com'].id,
      agencyId: agency.id,
      amenities: ['Piscine privée', 'WiFi Fibre', 'Clim toutes pièces', 'Cuisine équipée', 'Personnel inclus', 'Parking 3 véhicules'],
      images: ['https://placehold.co/800x600/047857/white?text=Villa+Piscine+Riviera'],
    },
  });

  // Réservations Akwaba
  const booking1 = await prisma.booking.create({
    data: {
      listingId: studioAkwaba.id,
      guestId: u['voyageur.paris@gmail.com'].id,
      startDate: new Date('2025-04-20'),
      endDate: new Date('2025-04-25'),
      totalPrice: 325_000,
      status: BookingStatus.COMPLETED,
      guestCount: 1,
    },
  });

  await prisma.bookingPayment.create({
    data: {
      bookingId: booking1.id,
      amount: 325_000,
      provider: PaymentProvider.WAVE,
      transactionId: `WAVE-2025-0420-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      status: PaymentStatus.SUCCESS,
      agencyCommission: 32_500,
      hostPayout: 292_500,
      platformCommission: 0,
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      listingId: villaAkwaba.id,
      guestId: u['voyage.dakar@gmail.com'].id,
      startDate: new Date('2025-05-02'),
      endDate: new Date('2025-05-07'),
      totalPrice: 1_250_000,
      status: BookingStatus.CONFIRMED,
      guestCount: 5,
    },
  });

  await prisma.bookingPayment.create({
    data: {
      bookingId: booking2.id,
      amount: 1_250_000,
      provider: PaymentProvider.ORANGE_MONEY,
      transactionId: `OM-2025-0502-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
      status: PaymentStatus.SUCCESS,
      agencyCommission: 125_000,
      hostPayout: 1_125_000,
      platformCommission: 0,
    },
  });

  // Avis voyageurs
  await prisma.review.createMany({
    data: [
      {
        listingId: studioAkwaba.id,
        authorId: u['voyageur.paris@gmail.com'].id,
        rating: 5,
        comment: 'Séjour parfait ! La vue sur la lagune est époustouflante. L\'appartement est exactement comme sur les photos. CORAIL IMMOBILIER est très professionnel.',
      },
      {
        listingId: villaAkwaba.id,
        authorId: u['voyage.dakar@gmail.com'].id,
        rating: 5,
        comment: 'Villa magnifique, piscine superbe. Idéale pour notre team retreat. On reviendra !',
      },
    ],
  });

  // ==========================================
  // 11. MODULE VENTE & FONCIER
  // ==========================================
  console.log('🏗️ Module Vente & Foncier...');

  const terrainBingerville = await prisma.propertyForSale.create({
    data: {
      title: 'Terrain 800m² Titre Foncier – Bingerville',
      description: 'Grand terrain plat en zone résidentielle de Bingerville. Titre Foncier sécurisé, borné et cadastré. Idéal pour promotion immobilière ou villa privée. Accès bitumé.',
      priceCfa: 45_000_000,
      surfaceArea: 800,
      location: 'Bingerville, Résidence Les Flamboyants',
      legalStatus: IvorianLegalStatus.TITRE_FONCIER,
      status: SaleTransactionStep.OFFER_PENDING,
      ownerId: u['traore.moussa@gmail.com'].id,
      images: ['https://placehold.co/800x600/047857/white?text=Terrain+TF+Bingerville'],
    },
  });

  const terrainACD = await prisma.propertyForSale.create({
    data: {
      title: 'Terrain 500m² ACD – Grand-Bassam Tourisme',
      description: 'Magnifique terrain à proximité de la plage de Grand-Bassam. ACD en cours de finalisation. Fort potentiel hôtelier ou résidentiel.',
      priceCfa: 28_000_000,
      surfaceArea: 500,
      location: 'Grand-Bassam, Zone Touristique',
      legalStatus: IvorianLegalStatus.ACD,
      status: SaleTransactionStep.AVAILABLE,
      ownerId: u['dago.holdings@gmail.com'].id,
      images: ['https://placehold.co/800x600/0369a1/white?text=Terrain+ACD+Bassam'],
    },
  });

  // Offres d'achat
  await prisma.saleOffer.create({
    data: {
      propertyId: terrainBingerville.id,
      buyerId: u['acheteur.terrain@gmail.com'].id,
      amountCfa: 42_000_000,
      status: QuoteStatus.PENDING,
    },
  });

  await prisma.saleOffer.create({
    data: {
      propertyId: terrainBingerville.id,
      buyerId: u['invest.abidjan@gmail.com'].id,
      amountCfa: 44_500_000,
      status: QuoteStatus.PENDING,
    },
  });

  // ==========================================
  // 12. INVESTISSEMENT CROWDFUNDING
  // ==========================================
  console.log('💰 Contrat d\'investissement...');
  await prisma.investmentContract.create({
    data: {
      userId: u['invest.abidjan@gmail.com'].id,
      status: InvestmentStatus.ACTIVE,
      packName: InvestmentPack.VIP,
      amount: 5_000_000,
      roi: 12.5,
      signedAt: new Date('2025-01-15'),
      ipAddress: '41.82.124.56',
      userAgent: 'Mozilla/5.0',
      signatureData: 'sig_vip_2025_coulibaly',
      paymentReference: `PAY-INVEST-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    },
  });

  // ==========================================
  // 13. MESSAGERIE & CONVERSATIONS
  // ==========================================
  console.log('💬 Conversations et messages...');

  const convAkwaba = await prisma.conversation.create({
    data: {
      guestId: u['voyage.dakar@gmail.com'].id,
      hostId: u['traore.moussa@gmail.com'].id,
      listingId: villaAkwaba.id,
    },
  });

  await prisma.message.createMany({
    data: [
      { conversationId: convAkwaba.id, senderId: u['voyage.dakar@gmail.com'].id, content: "Bonjour, la villa est-elle disponible du 2 au 7 mai pour 5 personnes ?" },
      { conversationId: convAkwaba.id, senderId: u['traore.moussa@gmail.com'].id, content: "Bonjour Rokhaya ! Oui, la villa est libre pour ces dates. Je vous confirme la réservation dès réception du paiement." },
      { conversationId: convAkwaba.id, senderId: u['voyage.dakar@gmail.com'].id, content: "Parfait, je procède au paiement via Orange Money de suite. Merci !" },
    ],
  });

  const convIncident = await prisma.conversation.create({
    data: {
      guestId: u['yao.kouame@gmail.com'].id,
      hostId: u['artisan.plomb@babimmo.ci'].id,
      incidentId: incidentPlomberie.id,
    },
  });

  await prisma.message.createMany({
    data: [
      { conversationId: convIncident.id, senderId: u['yao.kouame@gmail.com'].id, content: "Bonjour, la fuite est de plus en plus importante. Pouvez-vous intervenir rapidement ?" },
      { conversationId: convIncident.id, senderId: u['artisan.plomb@babimmo.ci'].id, content: "Bonjour M. Kouamé. J'ai envoyé le devis à l'agence. Dès validation, je peux intervenir sous 48h." },
    ],
  });

  // ==========================================
  // 14. LEADS COMMERCIAUX
  // ==========================================
  await prisma.lead.createMany({
    data: [
      { name: 'Monsieur Kobenan', phone: '+22507112233', needs: 'Cherche villa 4ch Cocody, budget 2M FCFA/mois', budget: 2_000_000, status: 'HOT', agentId: u['koffi@corailimmobilier.ci'].id },
      { name: 'Famille Ouattara', phone: '+22507445566', needs: 'Appartement F3 Riviera ou Angré, max 400k', budget: 400_000, status: 'WARM', agentId: u['fatou@corailimmobilier.ci'].id },
      { name: 'M. Soro (Entreprise)', phone: '+22507778899', needs: 'Bureau 50-100m² Plateau ou Marcory, urgent', budget: 800_000, status: 'NEW', agentId: u['koffi@corailimmobilier.ci'].id },
      { name: 'Mme Diabaté Aïcha', phone: '+22501223344', needs: 'Investissement terrain Bingerville, budget 50M', budget: 50_000_000, status: 'HOT', agentId: u['aminata@corailimmobilier.ci'].id },
    ],
  });

  // ==========================================
  // 15. NOTIFICATIONS (Dashboard vivant)
  // ==========================================
  console.log('🔔 Notifications...');
  await prisma.notification.createMany({
    data: [
      // Pour Aminata (AGENCY_ADMIN)
      { userId: u['aminata@corailimmobilier.ci'].id, title: '🚨 Loyer en retard – Villa Ambassades', message: 'M. Yao Kouamé n\'a pas réglé son loyer de mars 2025 (2 500 000 FCFA). Relance automatique envoyée.', type: 'ALERT', isRead: false },
      { userId: u['aminata@corailimmobilier.ci'].id, title: '📋 Mandat en attente de signature', message: 'Le mandat de gestion du Magasin Adjamé (Traoré) est signé par le propriétaire. En attente de votre contre-signature.', type: 'ACTION', isRead: false },
      { userId: u['aminata@corailimmobilier.ci'].id, title: '💼 2 offres sur le terrain de Bingerville', message: 'Rose Adjoumani (42M) et Dr. Coulibaly (44,5M) ont soumis des offres sur le Terrain TF Bingerville.', type: 'INFO', isRead: false },
      { userId: u['aminata@corailimmobilier.ci'].id, title: '🔧 Devis artisan reçu', message: 'Christian Aka a soumis un devis de 100 300 FCFA pour la fuite Villa Prestige. En attente de validation.', type: 'ACTION', isRead: true },
      { userId: u['aminata@corailimmobilier.ci'].id, title: '🌴 Réservation confirmée – Villa Piscine', message: 'Rokhaya Diallo (Dakar) a réservé et payé la Villa Piscine Riviera du 2 au 7 mai (1 250 000 FCFA).', type: 'SUCCESS', isRead: true },
      // Pour Koffi (Agent)
      { userId: u['koffi@corailimmobilier.ci'].id, title: '🚗 Mission visite planifiée', message: 'Visite de l\'Appartement Angré F4 prévue le 5 mai à 10h. Contact : Alpha Camara.', type: 'INFO', isRead: false },
      { userId: u['koffi@corailimmobilier.ci'].id, title: '🔥 Lead HOT – Mme Diabaté', message: 'Aminata vous a transféré le lead Diabaté Aïcha. Budget terrain 50M. À contacter en urgence.', type: 'ALERT', isRead: false },
      // Pour Traoré (Proprio)
      { userId: u['traore.moussa@gmail.com'].id, title: '⚠️ Loyer en retard – Votre Villa', message: 'Le loyer de mars de M. Kouamé est en retard. CORAIL IMMOBILIER gère la relance.', type: 'ALERT', isRead: false },
      { userId: u['traore.moussa@gmail.com'].id, title: '💰 Offre reçue sur votre terrain', message: 'Vous avez reçu 2 offres d\'achat sur votre Terrain Bingerville. La plus haute est à 44 500 000 FCFA.', type: 'INFO', isRead: true },
    ],
  });

  // ==========================================
  // 16. AUDIT LOGS (Traçabilité)
  // ==========================================
  await prisma.auditLog.createMany({
    data: [
      { action: AuditAction.LEASE_SIGNED, entityId: leaseVillaVIP.id, entityType: 'Lease', userId: u['aminata@corailimmobilier.ci'].id, userEmail: 'aminata@corailimmobilier.ci', metadata: { property: 'Villa Prestige Ambassades', tenant: 'Yao Kouamé' }, ipAddress: '41.82.124.56' },
      { action: AuditAction.PAYMENT_SUCCESS, entityId: leaseVillaVIP.id, entityType: 'Payment', userId: u['yao.kouame@gmail.com'].id, userEmail: 'yao.kouame@gmail.com', metadata: { amount: 2_500_000, month: 'Février 2025' }, ipAddress: '196.168.1.1' },
      { action: AuditAction.BOOKING_PAYMENT_SUCCESS, entityId: booking1.id, entityType: 'Booking', userId: u['voyageur.paris@gmail.com'].id, userEmail: 'voyageur.paris@gmail.com', metadata: { amount: 325_000, listing: 'Suite Exécutive Plateau' }, ipAddress: '82.45.12.3' },
      { action: AuditAction.KYC_VALIDATED, entityId: u['candidat.alpha@gmail.com'].id, entityType: 'User', userId: u['aminata@corailimmobilier.ci'].id, userEmail: 'aminata@corailimmobilier.ci', metadata: { candidate: 'Alpha Camara' }, ipAddress: '41.82.124.56' },
      { action: AuditAction.PROPERTY_CREATED, entityId: terrainBingerville.id, entityType: 'PropertyForSale', userId: u['aminata@corailimmobilier.ci'].id, userEmail: 'aminata@corailimmobilier.ci', metadata: { title: 'Terrain 800m² Bingerville' }, ipAddress: '41.82.124.56' },
    ],
  });

  // ==========================================
  // RÉSUMÉ FINAL
  // ==========================================
  console.log(`
✅ ========================================
   SEED DEMO — CORAIL IMMOBILIER — OK !
   ========================================

   🏢 Agence      : CORAIL IMMOBILIER
   🔑 Login démo  : aminata@corailimmobilier.ci
   🔐 Mot de passe: password123

   📊 DONNÉES CRÉÉES :
   ├── 17  utilisateurs (tous rôles couverts)
   ├── 5   biens sous gestion (villa, appts, bureau, magasin)
   ├── 5   mandats de gestion (4 actifs, 1 en attente signature)
   ├── 3   baux actifs (dont 1 en préavis de sortie)
   ├── 13  échéances de loyer (avec historique + retard)
   ├── 2   candidatures locataires en cours
   ├── 4   missions terrain (visite, EDL, photos)
   ├── 2   incidents (plomberie URGENT, électricité)
   ├── 1   devis artisan (100 300 FCFA, en attente)
   ├── 2   listings Akwaba (studio + villa piscine)
   ├── 2   réservations (1 complétée, 1 confirmée)
   ├── 2   avis 5 étoiles
   ├── 2   terrains en vente (TF + ACD)
   ├── 2   offres d'achat sur terrain Bingerville
   ├── 1   contrat investissement VIP (5M FCFA, ROI 12.5%)
   ├── 4   leads commerciaux (dont 2 HOT)
   ├── 9   notifications actives
   └── 5   logs d'audit
   ========================================
  `);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
