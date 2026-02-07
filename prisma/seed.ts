import { PrismaClient, Role, VerificationStatus, PropertyType, LeaseStatus, MissionType, IncidentStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Full Ecosystem Seed"...');

  // ==========================================
  // 1. GRAND NETTOYAGE
  // ==========================================
  console.log('🧹 Nettoyage de la base de données...');
  
  // Suppression en cascade (l'ordre compte pour éviter les erreurs de foreign key)
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
  
  // Tables dépendantes de User (Finance/KYC sont on-delete cascade normalement, mais on nettoie au cas où)
  await prisma.userFinance.deleteMany();
  await prisma.userKYC.deleteMany();
  await prisma.user.deleteMany(); 
  await prisma.agency.deleteMany();
  
  console.log('✨ Base de données immaculée.');

  const password = await hash('password123', 10);

  // ==========================================
  // 2. CRÉATION DE L'AGENCE
  // ==========================================
  const agency = await prisma.agency.create({
    data: {
      name: 'Immo Prestige International',
      slug: 'immo-prestige',
      code: 'IMMO-PRESTIGE',
      email: 'contact@immoprestige.ci',
      phone: '+225 0707070707',
      primaryColor: '#F59E0B',
      isActive: true,
      taxId: 'CC-1234567-X',
      logoUrl: 'https://placehold.co/400x400/0f172a/white?text=IP',
      walletBalance: 0
    },
  });
  console.log(`🏢 Agence créée : ${agency.name}`);

  // ==========================================
  // 3. CRÉATION DES UTILISATEURS
  // ==========================================
  const usersData = [
    { email: 'superadmin@immofacile.ci', name: 'Dieu (Super Admin)', role: Role.SUPER_ADMIN, agencyId: null, tier: 3 },
    { email: 'directeur@immoprestige.ci', name: 'M. le Directeur', role: Role.AGENCY_ADMIN, agencyId: agency.id, tier: 2 },
    { email: 'agent@immoprestige.ci', name: 'Alexandre Agent', role: Role.AGENT, jobTitle: 'Négociateur Immobilier', agencyId: agency.id, tier: 2 },
    { email: 'proprio.agence@gmail.com', name: 'Pierre Propriétaire (Géré)', role: Role.OWNER, agencyId: agency.id, tier: 2 },
    { email: 'proprio.solo@gmail.com', name: 'Sophie Indépendante', role: Role.OWNER, agencyId: null, tier: 2 },
    { email: 'locataire@gmail.com', name: 'Luc Locataire', role: Role.TENANT, jobTitle: 'Informaticien', income: 800000, agencyId: null, tier: 1 },
    { email: 'plombier@pro.ci', name: 'Mario Plombier', role: Role.ARTISAN, jobTitle: 'Plombier Certifié', phone: '+225 05050505', agencyId: null, tier: 2 },
    { email: 'investisseur@gmail.com', name: 'Ivan Investisseur', role: Role.INVESTOR, jobTitle: 'Business Angel', isBacker: true, backerTier: 'VISIONNAIRE', agencyId: null, tier: 3 },
    { email: 'touriste@gmail.com', name: 'Thomas Touriste', role: Role.GUEST, agencyId: null, tier: 1 },
  ];

  const usersMap: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        password: password,
        role: u.role,
        agencyId: u.agencyId,
        isVerified: true,
        phone: u.phone || undefined,
        jobTitle: u.jobTitle,
        isBacker: u.isBacker || false,
        backerTier: u.backerTier || null,

        // ✅ CORRECTION STRUCTURELLE KYC
        kyc: {
            create: {
                status: VerificationStatus.VERIFIED,
                idType: 'CNI',
                idNumber: 'CI-SEED-123456',
                documents: []
            }
        },

        // ✅ CORRECTION STRUCTURELLE FINANCE
        finance: {
            create: {
                walletBalance: 1000000, // On donne 1M à tout le monde pour tester
                kycTier: u.tier,
                income: u.income || 0,
                version: 1
            }
        }
      },
    });
    usersMap[u.email] = user;
  }
  console.log(`👥 ${usersData.length} Utilisateurs créés.`);

  // ==========================================
  // 4. PROPRIÉTÉ & GESTION
  // ==========================================
  const owner = usersMap['proprio.agence@gmail.com'];
  const tenant = usersMap['locataire@gmail.com'];
  const agent = usersMap['agent@immoprestige.ci'];
  const artisan = usersMap['plombier@pro.ci'];

  if (owner) {
    const property = await prisma.property.create({
      data: {
        title: 'Villa Duplex Cocody Ambassades',
        description: 'Magnifique villa 4 pièces avec piscine et jardin.',
        address: 'Rue des Jardins',
        commune: 'Cocody',
        price: 1500000,
        type: PropertyType.VILLA,
        bedrooms: 4,
        bathrooms: 3,
        surface: 250,
        isPublished: true,
        ownerId: owner.id,
        agencyId: agency.id,
        images: ['https://placehold.co/800x600/1e293b/white?text=Villa+Cocody'],
      },
    });
    console.log(`🏠 Bien créé : ${property.title}`);

    // --- BAIL ---
    if (tenant) {
      const lease = await prisma.lease.create({
        data: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-01-01'),
          monthlyRent: 1500000,
          depositAmount: 3000000,
          status: LeaseStatus.ACTIVE,
          isActive: true,
          propertyId: property.id,
          tenantId: tenant.id,
          contractUrl: 'https://example.com/contract.pdf',
          agentId: agent ? agent.id : null,
          agencyCommissionRate: 0.10
        },
      });
      console.log(`📜 Bail créé pour ${tenant.name}`);
      
      // --- INCIDENT ---
      if (artisan) {
          await prisma.incident.create({
              data: {
                  title: 'Fuite Salle de Bain',
                  description: 'Grosse fuite sous le lavabo, urgent.',
                  priority: 'HIGH',
                  status: IncidentStatus.IN_PROGRESS,
                  propertyId: property.id,
                  reporterId: tenant.id,
                  assignedToId: artisan.id,
                  photos: ['https://placehold.co/300?text=Fuite'],
                  createdAt: new Date()
              }
          });
          console.log(`🔧 Incident créé pour ${artisan.name}`);
      }
    }

    // --- MISSION ---
    if (agent) {
        await prisma.mission.create({
            data: {
                type: MissionType.ETAT_DES_LIEUX_SORTIE,
                status: 'PENDING',
                fee: 50000,
                dateScheduled: new Date(new Date().setDate(new Date().getDate() + 5)),
                propertyId: property.id,
                agentId: agent.id
            }
        });
    }
  }

  // ==========================================
  // 5. INVESTISSEMENT
  // ==========================================
  const investor = usersMap['investisseur@gmail.com'];
  if (investor) {
      await prisma.investmentContract.create({
          data: {
              userId: investor.id,
              amount: 5000000,
              packName: 'VISIONNAIRE',
              status: 'ACTIVE',
              paymentReference: 'INV-SEED-REF-001',
              ipAddress: '192.168.1.1',
              signatureData: 'data:image/png;base64,fake_signature...',
              signedAt: new Date(),
          }
      });
      console.log(`🚀 Contrat Investisseur créé.`);
  }

  console.log('✅ Seeding terminé avec succès ! 🚀');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
