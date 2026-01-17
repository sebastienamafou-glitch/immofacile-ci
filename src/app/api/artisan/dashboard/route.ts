import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Singleton

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ AUTH
    const userEmail = request.headers.get("x-user-email");
    if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION OPTIMISÉE (Tout en une seule requête)
    const artisan = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        walletBalance: true,
        // isAvailable: true, // ⚠️ DÉCOMMENTEZ SI VOUS AVEZ AJOUTÉ LE CHAMP DANS LE SCHEMA
        
        // On récupère directement les missions assignées ici
        incidentsAssigned: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] } // On cache les CLOSED
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdAt: true,
            quoteAmount: true,
            // Relations imbriquées
            property: { 
                select: { address: true, commune: true } 
            },
            reporter: { 
                select: { name: true, phone: true } 
            }
          }
        }
      }
    });

    // 3. VÉRIFICATION RÔLE
    if (!artisan || artisan.role !== "ARTISAN") {
        return NextResponse.json({ error: "Accès réservé aux artisans." }, { status: 403 });
    }

    // 4. FORMATAGE DES DONNÉES
    const formattedJobs = artisan.incidentsAssigned.map(j => ({
        id: j.id,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        address: `${j.property.address}, ${j.property.commune}`,
        reporterName: j.reporter.name,
        reporterPhone: j.reporter.phone, // Utile pour l'artisan pour appeler avant de venir
        quoteAmount: j.quoteAmount || 0,
        createdAt: j.createdAt
    }));

    return NextResponse.json({
      success: true,
      user: {
        name: artisan.name,
        email: artisan.email,
        walletBalance: artisan.walletBalance,
        // isAvailable: artisan.isAvailable // ⚠️ DÉCOMMENTEZ APRÈS MAJ SCHEMA
        isAvailable: true // Valeur par défaut temporaire pour ne pas faire planter
      },
      stats: {
        jobsCount: formattedJobs.length,
        rating: 4.8, // À implémenter plus tard
        earnings: artisan.walletBalance
      },
      jobs: formattedJobs
    });

  } catch (error) {
    console.error("Erreur Artisan Dashboard:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
