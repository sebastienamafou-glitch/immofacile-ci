import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post"; // ⚠️ INDISPENSABLE

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

// 1. UPLOAD (Corrige l'erreur 'url' et 'fields')
export async function getPresignedUploadUrl(fileKey: string, contentType: string) {
  return await createPresignedPost(s3Client, {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Conditions: [
      ["content-length-range", 0, 10 * 1024 * 1024], // Max 10MB
      ["starts-with", "$Content-Type", contentType],
    ],
    Fields: {
      "Content-Type": contentType,
    },
    Expires: 600,
  });
}

// 2. LECTURE (Reste identique mais sécurisé)
export async function getPresignedViewUrl(fileKey: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
