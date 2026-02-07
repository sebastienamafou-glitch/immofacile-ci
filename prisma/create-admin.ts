import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@immofacile.ci";
  const password = "admin123"; 

  const hashedPassword = await bcrypt.hash(password, 10);

  // Correction : On utilise la relation imbriquée 'kyc'
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
      role: "SUPER_ADMIN", 
      isVerified: true,
      image: "https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff",
      // 👇 C'est ici que ça change : Création imbriquée
      kyc: {
        create: {
            status: "VERIFIED",
            idType: "CNI"
        }
      },
      finance: {
        create: {
            walletBalance: 0,
            kycTier: 3
        }
      }
    },
  });

  console.log(`✅ Super Admin créé : ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
