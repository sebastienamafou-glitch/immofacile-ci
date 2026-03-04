import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // Assure-toi d'avoir installé bcryptjs

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, password, propertyId } = body;

    if (!name || !phone || !password || !propertyId) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    // 1. Vérification du bien
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: true }
    });

    if (!property) {
      return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
    }

    // 2. Gestion de l'utilisateur (Création ou Récupération)
    // On génère un email technique si ton schéma l'exige pour NextAuth
    const cleanPhone = phone.replace(/\s+/g, "");
    const technicalEmail = `${cleanPhone}@ambassadeur.babimmo.ci`;
    
    let ambassador = await prisma.user.findFirst({
      where: { 
        OR: [ { phone: cleanPhone }, { email: technicalEmail } ] 
      }
    });

    // S'il n'existe pas, on le crée
    if (!ambassador) {
      const hashedPassword = await bcrypt.hash(password, 10);
      ambassador = await prisma.user.create({
        data: {
          name,
          phone: cleanPhone,
          email: technicalEmail, 
          password: hashedPassword,
          role: "AMBASSADOR", // Ou "OWNER" selon la façon dont tu gères tes rôles
          isVerified: false
        }
      });
    }

    // 3. Le Transfert Magique
    await prisma.property.update({
      where: { id: propertyId },
      data: { ownerId: ambassador.id }
    });

    return NextResponse.json({ success: true, message: "Annonce récupérée avec succès" });

  } catch (error) {
    console.error("Erreur Claim Property:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
  }
}
