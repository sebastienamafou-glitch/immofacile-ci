import { PrismaClient, Role, VerificationStatus, PropertyType, LeaseStatus, MissionType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Full Ecosystem Seed"...');

  const password = await hash('password123', 10);

  // ==========================================
  // 1. CRÉATION DE L'AGENCE (Avec le code OBLIGATOIRE)
  // ==========================================
  const agency = await prisma.agency.upsert({
    where: { slug: 'immo-prestige' },
    update: {},
    create: {
      name: 'Immo Prestige International',
      slug: 'immo-prestige',
      code: 'IMMO-PRESTIGE', // <--- ✅ AJOUTÉ ICI (Obligatoire désormais)
      email: 'contact@immoprestige.ci',
      phone: '+225 0707070707',
      primaryColor: '#F59E0B',
      isActive: true,
      taxId: 'CC-1234567-X',
      logoUrl: 'https://placehold.co/400x400/0f172a/white?text=IP',
    },
  });
  console.log(`🏢 Agence créée : ${agency.name} (Code: ${agency.code})`);

  // ==========================================
  // 2. CRÉATION DES UTILISATEURS
  // ==========================================
  const users = [
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

  for (const u of users) {
    // @ts-ignore
    await prisma.user.upsert({
      where: { email: u.email },
      update: { agencyId: u.agencyId, role: u.role },
      create: {
        email: u.email,
        name: u.name,
        password: password,
        role: u.role,
        agencyId: u.agencyId,
        isVerified: true,
        kycStatus: VerificationStatus.VERIFIED,
        jobTitle: u.jobTitle,
        income: u.income, // @ts-ignore
        phone: u.role === Role.ARTISAN ? u.phone : undefined, // @ts-ignore
        isBacker: u.isBacker || false, // @ts-ignore
        backerTier: u.backerTier || null,
      },
    });
  }
  console.log(`👥 ${users.length} Utilisateurs traités.`);

  // Récupération ID
  const ownerManaged = await prisma.user.findUnique({ where: { email: 'proprio.agence@gmail.com' } });
  const tenant = await prisma.user.findUnique({ where: { email: 'locataire@gmail.com' } });
  const agent = await prisma.user.findUnique({ where: { email: 'agent@immoprestige.ci' } });
  const investor = await prisma.user.findUnique({ where: { email: 'investisseur@gmail.com' } });

  // ==========================================
  // 3. PROPRIÉTÉ
  // ==========================================
  let propertyId = 'prop-demo-01';
  if (ownerManaged) {
    const property = await prisma.property.upsert({
      where: { id: 'prop-demo-01' },
      update: {},
      create: {
        id: 'prop-demo-01',
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
        ownerId: ownerManaged.id,
        agencyId: agency.id,
        images: ['https://placehold.co/800x600/1e293b/white?text=Villa+Cocody'],
      },
    });
    console.log(`🏠 Bien créé/vérifié : ${property.title}`);

    // NETTOYAGE PRÉVENTIF (Anti-doublons)
    await prisma.lease.deleteMany({ where: { propertyId: property.id } });
    await prisma.mission.deleteMany({ where: { propertyId: property.id } });

    // 4. BAIL
    if (tenant) {
      await prisma.lease.create({
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
      console.log(`📜 Bail actif réinitialisé pour ${tenant.name}`);
    }

    // 5. MISSION
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
        console.log(`🕵️ Mission réinitialisée pour ${agent.name}`);
    }
  }

  // 6. INVESTISSEMENT
  if (investor) {
      await prisma.investmentContract.deleteMany({ where: { userId: investor.id } });

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
      console.log(`🚀 Contrat Investisseur réinitialisé pour ${investor.name}`);
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
