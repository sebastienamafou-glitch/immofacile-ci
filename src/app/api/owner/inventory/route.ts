import { NextResponse } from "next/server";
import { auth } from "@/auth";
 // ✅ On utilise la session sécurisée
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";
import { MissionType } from "@prisma/client";

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

// --- HELPER : UPLOAD CLOUDINARY ---
async function uploadToCloudinary(file: File | null, folder: string = "immofacile/inventory") {
  if (!file || file.size === 0) return null;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: folder,
        resource_type: "image",
        quality: "auto:good", 
        fetch_format: "auto"
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          resolve(""); 
        } else {
          resolve(result?.secure_url || "");
        }
      }
    );
    
    const Readable = require("stream").Readable;
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
}

// ==========================================
// 1. GET : Lister les états des lieux
// ==========================================
export async function GET(request: Request) {
  try {
    // 🔒 SÉCURITÉ BLINDÉE (Auth v5)
    // On remplace req.headers.get("x-user-id") par la session réelle
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. RÉCUPÉRATION SÉCURISÉE
    const inventories = await prisma.inventory.findMany({
      where: {
        lease: { property: { ownerId: userId } } // 🔒 Cadenas Propriétaire
      },
      orderBy: { date: 'desc' },
      include: {
        lease: {
            include: {
                property: { select: { title: true, commune: true } },
                tenant: { select: { name: true } }
            }
        },
        items: true
      }
    });

    return NextResponse.json({ success: true, inventories });

  } catch (error) {
    console.error("🚨 API Inventory GET:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// 2. POST : Créer un EDL
// ==========================================
export async function POST(request: Request) {
  try {
    // 🔒 SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = session.user.id;

    const formData = await request.formData();
    
    const leaseId = formData.get('leaseId') as string;
    const typeInput = formData.get('type') as string;
    const comment = formData.get('comment') as string;

    if (!leaseId || !typeInput) {
        return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 3. VÉRIFICATION DE PROPRIÉTÉ (Anti-IDOR)
    const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { property: true }
    });

    if (!lease) return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    
    if (lease.property.ownerId !== userId) {
        return NextResponse.json({ error: "Ce bail ne vous appartient pas." }, { status: 403 });
    }

    // 4. UPLOAD PARALLÈLE
    console.log("📸 Uploading images...");
    const [kitchenUrl, livingUrl, bathUrl] = await Promise.all([
        uploadToCloudinary(formData.get('kitchenPhoto') as File),
        uploadToCloudinary(formData.get('livingPhoto') as File),
        uploadToCloudinary(formData.get('bathPhoto') as File)
    ]);

    // 5. ENREGISTREMENT DB
    const inventory = await prisma.inventory.create({
        data: {
            date: new Date(),
            type: typeInput as MissionType,
            notes: comment,
            leaseId: leaseId,
            propertyId: lease.propertyId, 
            
            items: {
                create: [
                    {
                        roomName: "Cuisine",
                        element: "État Général",
                        condition: (formData.get('kitchenState') as string) || "NON_EVALUE",
                        photos: kitchenUrl ? [kitchenUrl] : []
                    },
                    {
                        roomName: "Salon",
                        element: "État Général",
                        condition: (formData.get('livingState') as string) || "NON_EVALUE",
                        photos: livingUrl ? [livingUrl] : []
                    },
                    {
                        roomName: "Salle de Bain",
                        element: "État Général",
                        condition: (formData.get('bathState') as string) || "NON_EVALUE",
                        photos: bathUrl ? [bathUrl] : []
                    }
                ]
            }
        },
        include: { items: true }
    });

    return NextResponse.json({ success: true, inventory });

  } catch (error: any) {
    console.error("🚨 API Inventory POST:", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}
