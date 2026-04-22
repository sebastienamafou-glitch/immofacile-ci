import { 
    PrismaClient, 
    Role, 
    VerificationStatus, 
    PropertyType, 
    LeaseStatus, 
    MissionType, 
    MissionStatus,
    IncidentStatus, 
    QuoteStatus,
    InvestmentStatus,
    InvestmentPack,
    PaymentType,
    PaymentStatus,
    BookingStatus,
    PaymentProvider
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Full Multi-Tenant Ecosystem Seed"...');

  // ==========================================
  // 1. NETTOYAGE INTÉGRAL (Ordre de contrainte)
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
  await prisma.lease.deleteMany(); 
  await prisma.listing.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.agencyTransaction.deleteMany();
  await prisma.property.deleteMany();
  await prisma.userFinance.deleteMany();
  await prisma.userKYC.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  // ⚠️ MOT DE PASSE UNIQUE POUR TOUS LES COMPTES DE TEST : password123
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
      defaultCommissionRate: 0.10
    }
  });

  // ==========================================
  // 3. UTILISATEURS & ROLES
  // ==========================================
  console.log('👤 Création des profils utilisateurs...');

  const usersData = [
    { email: 'admin@babimmo.ci', name: 'Super Admin', role: Role.SUPER_ADMIN, agencyId: null },
    { email: 'pierre@immoprestige.ci', name: 'Pierre Admin', role: Role.AGENCY_ADMIN, agencyId: agency.id },
    { email: 'jean@immoprestige.ci', name: 'Jean Agent', role: Role.AGENT, agencyId: agency.id },
    { email: 'sophie@gmail.com', name: 'Sophie Propriétaire Solo', role: Role.OWNER, agencyId: null },
    { email: 'kouassi@gmail.com', name: 'M. Kouassi (Client Agence)', role: Role.OWNER, agencyId: agency.id },
    { email: 'nouveau@gmail.com', name: 'Marie Prospect', role: Role.TENANT, agencyId: agency.id },
    { email: 'voyageur@test.com', name: 'Marc Voyageur', role: Role.GUEST, agencyId: null }, // ✅ LE COMPTE GUEST
    { email: 'artisan@babimmo.ci', name: 'Expert Plomberie', role: Role.ARTISAN, agencyId: null },
    { email: 'investisseur@gmail.com', name: 'Gilles Invest', role: Role.INVESTOR, agencyId: null }
  ];

  const usersMap: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        agencyId: u.agencyId,
        password,
        isVerified: true,
        finance: { 
            create: { 
                walletBalance: u.role === Role.OWNER ? 1000000 : 0,
                kycTier: (u.role === Role.TENANT || u.role === Role.OWNER) ? 3 : 1, 
                income: 0,
                monthlyVolume: 0,
                version: 1
            } 
        },
        kyc: { create: { status: VerificationStatus.VERIFIED, idType: "CNI", idNumber: `SEED-ID-${Math.floor(Math.random() * 1000)}`, documents: [] } }
      }
    });
    usersMap[u.email] = user;
  }

  // ==========================================
  // 4. PATRIMOINE LONGUE DURÉE & BAUX
  // ==========================================
  console.log('🏠 Configuration du patrimoine Longue Durée...');

  const villa = await prisma.property.create({
    data: {
      title: "Villa Emeraude",
      type: PropertyType.VILLA,
      address: "Riviera 3, Abidjan",
      commune: "Cocody",
      price: 1500000,
      bedrooms: 4,
      bathrooms: 3,
      surface: 250,
      ownerId: usersMap['kouassi@gmail.com'].id,
      agencyId: agency.id,
      isPublished: true, 
      images: ['https://placehold.co/800x600/1e293b/white?text=Villa+Cocody'],
    }
  });

  const lease = await prisma.lease.create({
    data: {
      propertyId: villa.id,
      tenantId: usersMap['nouveau@gmail.com'].id,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      monthlyRent: 1500000, 
      depositAmount: 3000000,
      advanceAmount: 1500000, 
      status: LeaseStatus.PENDING,
      isActive: false,
      agencyCommissionRate: 0.10
    }
  });

  await prisma.payment.create({
    data: {
      amount: 5400000, 
      type: PaymentType.DEPOSIT,
      status: PaymentStatus.PENDING,
      reference: 'DEP-POSTMAN-2026', 
      leaseId: lease.id,
      userId: usersMap['nouveau@gmail.com'].id,
    }
  });

  // ==========================================
  // 5. MODULE AKWABA (Court Séjour)
  // ==========================================
  console.log('🌴 Configuration du module Akwaba...');

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
      hostId: usersMap['sophie@gmail.com'].id, // Appartient à Sophie
      images: ['https://placehold.co/800x600/0f172a/white?text=Studio+Plateau'],
      amenities: ["WiFi", "Climatisation", "TV 4K", "Netflix"],
    }
  });

  // Création d'un séjour terminé dans le passé (pour tester le modal d'avis du Guest)
  const pastDateStart = new Date();
  pastDateStart.setDate(pastDateStart.getDate() - 10);
  const pastDateEnd = new Date();
  pastDateEnd.setDate(pastDateEnd.getDate() - 5);

  await prisma.booking.create({
    data: {
      startDate: pastDateStart,
      endDate: pastDateEnd,
      totalPrice: 175000, // 5 nuits * 35000
      status: BookingStatus.COMPLETED, // Séjour terminé
      guestId: usersMap['voyageur@test.com'].id, // Le testeur Playwright
      listingId: listing.id,
      guestCount: 2,
      payment: {
          create: {
              amount: 175000,
              provider: PaymentProvider.CINETPAY,
              transactionId: "TX-AKWABA-SEED-123",
              status: PaymentStatus.SUCCESS,
              agencyCommission: 0,
              hostPayout: 157500, // 175000 - 10%
              platformCommission: 17500
          }
      }
    }
  });

  // ==========================================
  // 6. MAINTENANCE (Flux Artisan)
  // ==========================================
  console.log('🛠️ Initialisation du module maintenance...');

  await prisma.incident.create({
    data: {
      title: "Fuite d'eau Cuisine",
      description: "Inondation sous l'évier principal.",
      status: IncidentStatus.OPEN,
      priority: "HIGH",
      propertyId: villa.id,
      reporterId: usersMap['nouveau@gmail.com'].id,
      photos: []
    }
  });

  // ==========================================
  // 7. INVESTISSEMENT
  // ==========================================
  await prisma.investmentContract.create({
      data: {
          userId: usersMap['investisseur@gmail.com'].id,
          amount: 10000000,
          packName: InvestmentPack.PREMIUM,
          status: InvestmentStatus.ACTIVE,
          paymentReference: 'INV-SEED-001',
          signedAt: new Date(),
          ipAddress: '192.168.1.1', 
          signatureData: 'data:image/png;base64,fake_signature...', 
      }
  });

  console.log('✅ Seeding Multi-Tenant terminé avec succès ! 🚀');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
