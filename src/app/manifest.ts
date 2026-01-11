import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ImmoFacile - Gestion Immobilière',
    short_name: 'ImmoFacile',
    description: 'Plateforme intelligente pour propriétaires, locataires et agents.',
    start_url: '/',
    display: 'standalone', // C'est ça qui enlève la barre d'URL du navigateur sur mobile
    background_color: '#0B1120', // Votre fond bleu nuit (pour l'écran de chargement)
    theme_color: '#ea580c', // Votre orange (pour la barre de statut Android)
    icons: [
      {
        src: '/icon.png', // Next.js ira chercher l'image que vous avez mise dans src/app/
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
