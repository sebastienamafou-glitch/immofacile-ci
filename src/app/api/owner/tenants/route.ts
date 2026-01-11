import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs"; // npm install bcryptjs

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const owner = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!owner) return NextResponse.json({ error: "Inconnu" }, { status: 403 });

    const body = await request.json();
    // body: { propertyId, tenantName, tenantPhone, monthlyRent, depositMonths, startDate }

    // 2. VALIDATION DU BIEN
    const property = await prisma.property.findFirst({
        where: { id: body.propertyId, ownerId: owner.id }
    });
    
    if (!property) {
        return NextResponse.json({ error: "Bien invalide ou non autorisé." }, { status: 400 });
    }

    // 3. GESTION DU LOCATAIRE (Find or Create par Téléphone)
    let tenant = await prisma.user.findUnique({
        where: { phone: body.tenantPhone }
    });

    let newCredentials = null;

    if (!tenant) {
        // --- CRÉATION DU COMPTE LOCATAIRE ---
        // Génération d'un mot de passe aléatoire
        const tempPassword = Math.random().toString(36).slice(-8) + "Immo!";
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Génération d'un email unique (car l'email est obligatoire dans Prisma)
        // Format: 0707070707@immofacile.user
        const generatedEmail = `${body.tenantPhone}@immofacile.user`;

        try {
            tenant = await prisma.user.create({
                data: {
                    name: body.tenantName,
                    phone: body.tenantPhone,
                    email: generatedEmail, 
                    password: hashedPassword,
                    role: "TENANT",
                    kycStatus: "PENDING",
                    walletBalance: 0
                }
            });
            
            // On prépare les identifiants à renvoyer au frontend
            newCredentials = {
                phone: body.tenantPhone,
                password: tempPassword
            };
        } catch (e) {
            return NextResponse.json({ error: "Erreur création compte (Email ou Tel déjà utilisé)." }, { status: 500 });
        }
    }

    // 4. CRÉATION DU BAIL
    // Calcul de la caution : Loyer x Mois de caution
    const monthlyRentInt = parseInt(body.monthlyRent);
    const depositAmount = monthlyRentInt * parseInt(body.depositMonths);

    const newLease = await prisma.lease.create({
        data: {
            startDate: new Date(body.startDate),
            monthlyRent: monthlyRentInt,
            depositAmount: depositAmount,
            status: "ACTIVE",
            isActive: true, // Le bail est actif immédiatement
            tenant: { connect: { id: tenant.id } },
            property: { connect: { id: property.id } }
        }
    });

    return NextResponse.json({
        success: true,
        lease: newLease,
        credentials: newCredentials // Sera null si le locataire existait déjà
    });

  } catch (error) {
    console.error("Erreur Création Bail:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création." }, { status: 500 });
  }
}
