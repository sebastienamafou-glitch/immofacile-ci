import { PrismaClient, Role, VerificationStatus, PropertyType, LeaseStatus, MissionType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du "Full Ecosystem Seed"...');

  // Mot de passe unique pour TOUS les comptes de test
  const password = await hash('password123', 10);

  // ==========================================
  // 1. CRÉATION DE L'AGENCE (Le SaaS Tenant)
  // ==========================================
  const agency = await prisma.agency.upsert({
    where: { slug: 'immo-prestige' },
    update: {},
    create: {
      name: 'Immo Prestige International',
      slug: 'immo-prestige',
      email: 'contact@immoprestige.ci',
      phone: '+225 0707070707',
      primaryColor: '#F59E0B', // Orange
      isActive: true,
      taxId: 'CC-1234567-X',
      logoUrl: 'https://placehold.co/400x400/0f172a/white?text=IP',
    },
  });
  console.log(`🏢 Agence créée : ${agency.name}`);

  // ==========================================
  // 2. CRÉATION DES UTILISATEURS (Les Acteurs)
  // ==========================================
  
  const users = [
    {
      email: 'superadmin@immofacile.ci',
      name: 'Dieu (Super Admin)',
      role: Role.SUPER_ADMIN,
      agencyId: null,
    },
    {
      email: 'directeur@immoprestige.ci',
      name: 'M. le Directeur',
      role: Role.AGENCY_ADMIN,
      agencyId: agency.id, // Patron de l'agence
    },
    {
      email: 'agent@immoprestige.ci',
      name: 'Alexandre Agent',
      role: Role.AGENT,
      jobTitle: 'Négociateur Immobilier',
      agencyId: agency.id, // Employé de l'agence
    },
    {
      email: 'proprio.agence@gmail.com',
      name: 'Pierre Propriétaire (Géré)',
      role: Role.OWNER,
      agencyId: agency.id, // A délégué ses biens à l'agence
    },
    {
      email: 'proprio.solo@gmail.com',
      name: 'Sophie Indépendante',
      role: Role.OWNER,
      agencyId: null, // Gère ses biens seule
    },
    {
      email: 'locataire@gmail.com',
      name: 'Luc Locataire',
      role: Role.TENANT,
      jobTitle: 'Informaticien',
      income: 800000,
      agencyId: null,
    },
    {
      email: 'plombier@pro.ci',
      name: 'Mario Plombier',
      role: Role.ARTISAN,
      jobTitle: 'Plombier Certifié',
      phone: '+225 05050505',
      agencyId: null,
    },
    {
      email: 'investisseur@gmail.com',
      name: 'Ivan Investisseur',
      role: Role.INVESTOR, // ✅ Nouveau Rôle
      jobTitle: 'Business Angel',
      isBacker: true, // ✅ Badge activé
      backerTier: 'VISIONNAIRE',
      agencyId: null,
    },
    {
      email: 'touriste@gmail.com',
      name: 'Thomas Touriste',
      role: Role.GUEST,
      agencyId: null,
    },
  ];

  for (const u of users) {
    // @ts-ignore (Pour ignorer les champs dynamiques comme isBacker qui n'existent pas sur tous les users)
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
  console.log(`👥 ${users.length} Utilisateurs créés/mis à jour.`);

  // Récupération des IDs pour les relations
  const ownerManaged = await prisma.user.findUnique({ where: { email: 'proprio.agence@gmail.com' } });
  const tenant = await prisma.user.findUnique({ where: { email: 'locataire@gmail.com' } });
  const agent = await prisma.user.findUnique({ where: { email: 'agent@immoprestige.ci' } });
  const investor = await prisma.user.findUnique({ where: { email: 'investisseur@gmail.com' } });

  // ==========================================
  // 3. CRÉATION D'UN BIEN GÉRÉ 
  // ==========================================
  let propertyId = 'prop-demo-01'; // Variable pour réutilisation
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
    propertyId = property.id;
    console.log(`🏠 Bien créé : ${property.title}`);

    // ==========================================
    // 4. CRÉATION D'UN BAIL ACTIF 
    // ==========================================
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
          // On lie l'agent pour tester les commissions
          agentId: agent ? agent.id : null, 
        },
      });
      console.log(`📜 Bail actif créé pour ${tenant.name}`);
    }

    // ==========================================
    // 5. CRÉATION D'UNE MISSION AGENT
    // ==========================================
    if (agent) {
        await prisma.mission.create({
            data: {
                type: MissionType.ETAT_DES_LIEUX_SORTIE,
                status: 'PENDING',
                fee: 50000,
                dateScheduled: new Date(new Date().setDate(new Date().getDate() + 5)), // Dans 5 jours
                propertyId: property.id,
                agentId: agent.id
            }
        });
        console.log(`🕵️ Mission assignée à ${agent.name}`);
    }
  }

  // ==========================================
  // 6. ✅ CRÉATION D'UN CONTRAT D'INVESTISSEMENT (CROWDFUNDING)
  // ==========================================
  if (investor) {
      await prisma.investmentContract.create({
          data: {
              userId: investor.id,
              amount: 5000000, // 5 Millions
              packName: 'VISIONNAIRE',
              status: 'ACTIVE', // Déjà payé
              paymentReference: 'INV-SEED-REF-001', // Simulation ID CinetPay
              ipAddress: '192.168.1.1',
              signatureData: 'data:image/png;base64,fake_signature...',
              signedAt: new Date(),
          }
      });
      console.log(`🚀 Contrat Investisseur créé pour ${investor.name} (5.000.000 FCFA)`);
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
