import { PrismaClient, Role, VerificationStatus, PropertyType, LeaseStatus, MissionType, QuoteStatus, IncidentStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Full Ecosystem Seed"...');

  // ==========================================
  // 1. GRAND NETTOYAGE (Ordre Hiérarchique Strict)
  // ==========================================
  console.log('🧹 Nettoyage de la base de données...');
  
  // Niveau 4 : Les "Petits-enfants" (Dépendent de tout)
  await prisma.quoteItem.deleteMany();
  await prisma.message.deleteMany();
  await prisma.signatureProof.deleteMany(); // ✅ Débloque les Baux
  await prisma.inventoryItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingPayment.deleteMany();
  
  // Niveau 3 : Les "Enfants"
  await prisma.quote.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.investmentContract.deleteMany();
  
  // Niveau 2 : Les "Parents"
  await prisma.lease.deleteMany(); 
  await prisma.listing.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.agencyTransaction.deleteMany();
  
  // Niveau 1 : Les "Racines"
  await prisma.property.deleteMany();
  
  // Niveau 0 : Les Acteurs
  // On ne supprime les users/agences que si on veut repartir de zéro absolu
  // Ici on delete tout pour être propre
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
    },
  });
  console.log(`🏢 Agence créée : ${agency.name}`);

  // ==========================================
  // 3. CRÉATION DES UTILISATEURS
  // ==========================================
  const usersData = [
    { email: 'superadmin@immofacile.ci', name: 'Dieu (Super Admin)', role: Role.SUPER_ADMIN, agencyId: null },
    { email: 'directeur@immoprestige.ci', name: 'M. le Directeur', role: Role.AGENCY_ADMIN, agencyId: agency.id },
    { email: 'agent@immoprestige.ci', name: 'Alexandre Agent', role: Role.AGENT, jobTitle: 'Négociateur Immobilier', agencyId: agency.id },
    { email: 'proprio.agence@gmail.com', name: 'Pierre Propriétaire (Géré)', role: Role.OWNER, agencyId: agency.id },
    { email: 'proprio.solo@gmail.com', name: 'Sophie Indépendante', role: Role.OWNER, agencyId: null },
    { email: 'locataire@gmail.com', name: 'Luc Locataire', role: Role.TENANT, jobTitle: 'Informaticien', income: 800000, agencyId: null },
    { email: 'plombier@pro.ci', name: 'Mario Plombier', role: Role.ARTISAN, jobTitle: 'Plombier Certifié', phone: '+225 05050505', agencyId: null },
    { email: 'investisseur@gmail.com', name: 'Ivan Investisseur', role: Role.INVESTOR, jobTitle: 'Business Angel', isBacker: true, backerTier: 'VISIONNAIRE', agencyId: null },
    { email: 'touriste@gmail.com', name: 'Thomas Touriste', role: Role.GUEST, agencyId: null },
  ];

  // On stocke les users créés dans une map pour y accéder facilement
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
        kycStatus: VerificationStatus.VERIFIED,
        jobTitle: u.jobTitle,
        income: u.income, 
        // @ts-ignore
        phone: u.phone, 
        // @ts-ignore
        isBacker: u.isBacker || false,
        // @ts-ignore
        backerTier: u.backerTier || null,
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
        },
      });
      console.log(`📜 Bail créé pour ${tenant.name}`);
      
      // --- INCIDENT & DEVIS (Pour tester le module Artisan) ---
      if (artisan) {
          const incident = await prisma.incident.create({
              data: {
                  title: 'Fuite Salle de Bain',
                  description: 'Grosse fuite sous le lavabo, urgent.',
                  priority: 'HIGH',
                  status: IncidentStatus.IN_PROGRESS, // Déjà en cours
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
