/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. GESTION DES IMAGES (Mode Permissif)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // ✅ Autorise TOUS les domaines d'images
      },
    ],
  },

  // 2. SÉCURITÉ RENFORCÉE (HEADERS HTTP)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
