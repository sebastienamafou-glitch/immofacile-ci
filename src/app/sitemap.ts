import { MetadataRoute } from 'next';
import { prisma } from "@/lib/prisma"; // 👈 Vérifiez que ce chemin vers votre instance Prisma est correct

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.immofacile.ci';

  // 1. Récupérer toutes les propriétés (Longue Durée) actives
  // Si votre modèle s'appelle différemment (ex: Property), adaptez ici.
  const properties = await prisma.property.findMany({
    // where: { isPublished: true }, // Décommentez si vous avez un champ 'isPublished'
    select: {
      id: true,
      updatedAt: true,
    },
  });

  const propertyUrls = properties.map((property) => ({
    url: `${baseUrl}/properties/${property.id}`,
    lastModified: property.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // 2. Récupérer toutes les annonces (Courte Durée / Akwaba) actives
  const listings = await prisma.listing.findMany({
    // where: { isPublished: true }, // Décommentez si vous avez un champ 'isPublished'
    select: {
      id: true,
      updatedAt: true,
    },
  });

  const listingUrls = listings.map((listing) => ({
    url: `${baseUrl}/akwaba/${listing.id}`,
    lastModified: listing.updatedAt,
    changeFrequency: 'daily' as const, // Change souvent (disponibilités)
    priority: 0.9,
  }));

  // 3. Les pages statiques (Celles que vous m'avez données)
  const staticRoutes = [
    '',             // La page d'accueil
    '/properties',  // Liste des biens
    '/akwaba',      // Liste courte durée
    '/invest',      // Investissement
    '/compliance',  // Conformité
    '/login',       // Connexion
    '/signup',      // Inscription
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // 4. On fusionne tout
  return [...staticRoutes, ...propertyUrls, ...listingUrls];
}
