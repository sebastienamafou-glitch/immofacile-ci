import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { listingId, startDate, endDate, guestEmail } = body;

    // 1. VALIDATION DE BASE
    if (!listingId || !startDate || !endDate || !guestEmail) {
      return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }

    // 2. RECUPÉRER L'ANNONCE (Pour le prix officiel)
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { 
        agency: true // Pour savoir si on doit une com' à une agence (logique future)
      }
    });

    if (!listing) return NextResponse.json({ error: "Logement introuvable" }, { status: 404 });

    // 3. VÉRIFIER LES DISPONIBILITÉS (Anti-Double Booking)
    const overlap = await prisma.booking.findFirst({
      where: {
        listingId,
        status: { in: ['CONFIRMED', 'PAID'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (overlap) {
      return NextResponse.json({ 
        error: "Désolé, ce logement vient d'être réservé sur ces dates." 
      }, { status: 409 });
    }

    // 4. CALCUL FINANCIER SÉCURISÉ (Backend Side)
    const nights = differenceInDays(end, start);
    if (nights < 1) return NextResponse.json({ error: "Minimum 1 nuit" }, { status: 400 });

    const subTotal = listing.pricePerNight * nights; // Part Propriétaire
    const platformFee = Math.round(subTotal * 0.10); // 10% ImmoFacile
    const totalAmount = subTotal + platformFee;      // Ce que paie le client

    // 5. GESTION DU GUEST (Find or Create)
    // On cherche l'utilisateur par email, sinon on le crée
    let guest = await prisma.user.findUnique({ where: { email: guestEmail } });

    if (!guest) {
      // Création automatique d'un compte Guest
      guest = await prisma.user.create({
        data: {
          email: guestEmail,
          name: guestEmail.split('@')[0], // Nom par défaut
          role: 'GUEST',
          isVerified: false
        }
      });
    }

    // 6. CRÉATION TRANSACTIONNELLE (Booking + Paiement)
    // On simule un paiement réussi (Wave/OM)
    const transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newBooking = await prisma.booking.create({
      data: {
        listingId,
        guestId: guest.id,
        startDate: start,
        endDate: end,
        totalPrice: totalAmount,
        status: 'CONFIRMED', // Directement confirmé car paiement simulé OK
        
        // On crée le paiement lié immédiatement
        payment: {
            create: {
                amount: totalAmount,
                provider: 'WAVE', // Simulé
                transactionId: transactionId,
                status: 'SUCCESS',
                
                // SPLIT DES FONDS
                hostPayout: subTotal,         // Ce qui va au propriétaire
                agencyCommission: platformFee // Ce qui reste à la plateforme
            }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      bookingId: newBooking.id,
      message: "Réservation confirmée !" 
    });

  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
