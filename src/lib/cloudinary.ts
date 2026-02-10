'use server'

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getCloudinarySignature() {
  // On sécurise l'upload : Seul ce timestamp et ce preset (optionnel) sont valides
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Génération de la signature HMAC-SHA256
  const signature = cloudinary.utils.api_sign_request(
    { timestamp },
    process.env.CLOUDINARY_API_SECRET!
  );

  return { timestamp, signature };
}
