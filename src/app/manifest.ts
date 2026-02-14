import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ImmoFacile - Gestion Immobilière',
    short_name: 'ImmoFacile',
    description: "Plateforme intelligente pour propriétaires et locataires en Côte d'Ivoire.",
    start_url: '/',
    display: 'standalone',
    background_color: '#0B1120',
    theme_color: '#ea580c',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png', // ✅ Nom corrigé (était /icon.png)
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png', // ✅ Nom corrigé
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
  };
}
