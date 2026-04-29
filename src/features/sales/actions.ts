'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { VerificationStatus, IvorianLegalStatus } from '@prisma/client';
import { decrypt } from '@/lib/crypto';
import { redirect } from 'next/navigation';

export async function submitSaleOffer(propertyId: string, amount: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Authentification requise');

  const kyc = await prisma.userKYC.findUnique({
    where: { userId: session.user.id },
    select: { status: true }
  });

  if (kyc?.status !== VerificationStatus.VERIFIED) {
    throw new Error('Votre KYC doit être validé pour faire une offre.');
  }

  const property = await prisma.propertyForSale.findUnique({
    where: { id: propertyId },
    select: { title: true, ownerId: true, priceCfa: true }
  });

  if (!property) throw new Error('Bien introuvable');

  await prisma.$transaction([
    prisma.saleOffer.create({
      data: {
        propertyId,
        buyerId: session.user.id,
        amountCfa: amount,
        status: 'PENDING'
      }
    }),
    prisma.notification.create({
      data: {
        userId: property.ownerId,
        title: "Nouvelle offre reçue ! 🏠",
        message: `Un acheteur propose ${amount.toLocaleString()} FCFA pour votre bien : ${property.title}.`,
        type: "INFO",
        link: `/dashboard/sales/${propertyId}/offers`
      }
    })
  ]);

  revalidatePath(`/sales/${propertyId}`);
  return { success: true };
}

export async function acceptSaleOffer(offerId: string, formData?: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Authentification requise');

  const offer = await prisma.saleOffer.findUnique({
    where: { id: offerId },
    include: {
      property: { select: { id: true, ownerId: true, title: true } }
    }
  });

  if (!offer || offer.property.ownerId !== session.user.id) {
    throw new Error('Action non autorisée');
  }

  if (offer.status !== 'PENDING') {
    throw new Error('Cette offre ne peut plus être modifiée');
  }

  await prisma.$transaction(async (tx) => {
    await tx.saleOffer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED' }
    });

    await tx.saleOffer.updateMany({
      where: { 
        propertyId: offer.property.id,
        id: { not: offerId },
        status: 'PENDING'
      },
      data: { status: 'REJECTED' }
    });

    await tx.propertyForSale.update({
      where: { id: offer.property.id },
      data: { status: 'OFFER_ACCEPTED' }
    });

    await tx.notification.create({
      data: {
        userId: offer.buyerId,
        title: "Offre Acceptée ! 🎉",
        message: `Félicitations ! Votre offre pour le bien "${offer.property.title}" a été acceptée par le vendeur.`,
        type: "SUCCESS",
        link: `/dashboard/purchases/${offer.property.id}`
      }
    });
  });

  revalidatePath(`/dashboard/sales/${offer.property.id}/offers`);
}

// ==========================================
// MOTEUR DE CRÉATION DE BIEN À VENDRE
// ==========================================
// Adapté pour lire nativement le FormData soumis par la page
export async function createPropertyForSale(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Authentification requise');

  await prisma.propertyForSale.create({
    data: {
      title: formData.get('title') as string,
      description: formData.get('description') as string || '',
      priceCfa: Number(formData.get('priceCfa') || 0),
      surfaceArea: Number(formData.get('surfaceArea') || 0),
      location: formData.get('location') as string,
      legalStatus: (formData.get('legalStatus') as IvorianLegalStatus) || 'ACD',
      images: [], //TODO: Intégrer l'upload d'images (Cloudinary/S3)
      ownerId: session.user.id,
      status: 'AVAILABLE'
    }
  });

  revalidatePath('/dashboard/sales');
  redirect('/dashboard/sales');
}

// ==========================================
// MOTEUR DE GÉNÉRATION DU COMPROMIS DE VENTE
// ==========================================
export async function generateContractData(offerId: string) {
  const session = await auth();
  if (!session) throw new Error("Non authentifié");

  const offer = await prisma.saleOffer.findUnique({
    where: { id: offerId },
    include: {
      property: {
        include: { 
          owner: { include: { kyc: true } } 
        }
      },
      buyer: { include: { kyc: true } }
    }
  });

  if (!offer || offer.status !== 'ACCEPTED') {
    throw new Error("L'offre doit être acceptée pour générer un compromis.");
  }

  if (session.user?.id !== offer.buyerId && session.user?.id !== offer.property.ownerId) {
     throw new Error("Accès non autorisé à ce contrat.");
  }

  const sellerIdNumber = offer.property.owner.kyc?.idNumber 
    ? decrypt(offer.property.owner.kyc.idNumber) 
    : "Non renseigné";
    
  const buyerIdNumber = offer.buyer.kyc?.idNumber 
    ? decrypt(offer.buyer.kyc.idNumber) 
    : "Non renseigné";

  return {
    reference: `BABI-${offer.id.substring(0, 8).toUpperCase()}`,
    date: new Date().toLocaleDateString('fr-FR'),
    price: Number(offer.amountCfa),
    property: {
      title: offer.property.title,
      location: offer.property.location,
      surface: offer.property.surfaceArea,
      legalStatus: offer.property.legalStatus
    },
    seller: {
      name: offer.property.owner.name,
      idType: offer.property.owner.kyc?.idType || "CNI",
      idNumber: sellerIdNumber,
      address: offer.property.owner.address || "Abidjan, Côte d'Ivoire"
    },
    buyer: {
      name: offer.buyer.name,
      idType: offer.buyer.kyc?.idType || "CNI",
      idNumber: buyerIdNumber,
      address: offer.buyer.address || "Abidjan, Côte d'Ivoire"
    }
  };
}
