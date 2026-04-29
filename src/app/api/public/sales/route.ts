import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commune = searchParams.get("commune");
    const legalStatus = searchParams.get("legalStatus");

    const sales = await prisma.propertyForSale.findMany({
      where: {
        status: "AVAILABLE",
        ...(commune && { location: { contains: commune, mode: 'insensitive' } }),
        ...(legalStatus && { legalStatus: legalStatus as any }),
      },
      include: {
        owner: {
          select: { kyc: { select: { status: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, properties: sales });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des ventes" }, { status: 500 });
  }
}
