import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ImmoFacile - Gestion Immobilière',
    short_name: 'ImmoFacile',
    description: 'Plateforme intelligente pour propriétaires et locataires en Côte d\'Ivoire.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1120',
    theme_color: '#ea580c',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    // Nettoyage strict pour Next.js (Suppression de label et form_factor)
    screenshots: [
      {
        src: '/screenshots/mobile-home.png',
        sizes: '1080x1920',
        type: 'image/png',
      },
    ],
  };
}
