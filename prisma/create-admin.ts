// Fichier: prisma/create-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@immofacile.ci";
  const password = "admin123"; // Changez-le après !

  // 1. Hachage du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. Création ou Mise à jour
  const user = await prisma.user.upsert({
    where: { email },
    update: { 
        role: "SUPER_ADMIN",
        isVerified: true
    },
    create: {
      email,
      name: "Direction ImmoFacile",
      password: hashedPassword,
      role: "SUPER_ADMIN", // Le rôle clé
      isVerified: true,
      kycStatus: "VERIFIED",
      image: "https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff"
    },
  });

  console.log(`✅ Super Admin créé : ${user.email} (Mot de passe: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
