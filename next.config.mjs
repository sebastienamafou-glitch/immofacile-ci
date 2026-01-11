/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Utile si vous utilisez des images de démo
        pathname: '**',
      }
    ],
  },
};

export default nextConfig;
