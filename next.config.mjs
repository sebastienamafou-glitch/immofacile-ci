/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. GESTION DES IMAGES
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Ajoutez ici votre bucket AWS S3 si nécessaire plus tard
    ],
  },

  // 2. SÉCURITÉ RENFORCÉE (HEADERS HTTP)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Empêche votre site d'être affiché dans une iframe (Anti-Clickjacking)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Empêche le navigateur de deviner le type de fichier
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Protège les données de navigation
          },
          {
            key: 'Permissions-Policy',
            value: "camera=(), microphone=(), geolocation=()", // Bloque l'accès aux capteurs par défaut
          }
        ],
      },
    ];
  },
};

export default nextConfig;
