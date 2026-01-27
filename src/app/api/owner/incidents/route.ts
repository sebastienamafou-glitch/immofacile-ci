import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

// --- HELPER : UPLOAD CLOUDINARY STANDARDISÉ ---
async function uploadToCloudinary(file: File | null) {
  if (!file || file.size === 0) return null;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "immofacile/incidents" },
      (error, result) => {
        if (error) {
            console.error("Cloudinary Error:", error);
            resolve(""); 
        } else {
            resolve(result?.secure_url || "");
        }
      }
    );
    // Node Stream hack pour Next.js App Router
    const Readable = require("stream").Readable;
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
}

// ==========================================
// 1. GET : Lister les incidents (Sécurisé par ID)
// ==========================================
export async function GET(req: Request) {
    try {
        // ✅ ZERO TRUST : Auth via ID
        const userId = req.headers.get("x-user-id");
        if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        
        const incidents = await prisma.incident.findMany({
            where: { 
                property: { ownerId: userId } // 🔒 Cadenas Propriétaire
            },
            orderBy: [
                { status: 'asc' }, // OPEN d'abord
                { createdAt: 'desc' }
            ],
            include: { 
                property: { select: { id: true, title: true } }, 
                reporter: { select: { name: true, phone: true, role: true } } 
            }
        });
        
        return NextResponse.json({ success: true, incidents });
    } catch (e) { 
        console.error("GET Incidents Error:", e);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); 
    }
}

// ==========================================
// 2. POST : CRÉER un incident (Owner)
// ==========================================
export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const propertyId = formData.get('propertyId') as string;
    const photoFile = formData.get('photo') as File | null;

    if (!title || !propertyId) {
        return NextResponse.json({ error: "Titre et Propriété requis" }, { status: 400 });
    }

    // Sécurité : Le bien appartient-il au user ?
    const property = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: userId }
    });
    
    if (!property) return NextResponse.json({ error: "Propriété invalide ou accès refusé" }, { status: 403 });

    // Upload Photo
    let photoUrl = null;
    if (photoFile) {
        photoUrl = await uploadToCloudinary(photoFile);
    }

    const newIncident = await prisma.incident.create({
        data: {
            title,
            description: description || "",
            status: "OPEN",
            priority: "NORMAL",
            photos: photoUrl ? [photoUrl] : [],
            propertyId: property.id,
            reporterId: userId // Le propriétaire signale lui-même
        }
    });

    return NextResponse.json({ success: true, incident: newIncident });

  } catch (error) {
    console.error("POST Incident Error:", error);
    return NextResponse.json({ error: "Erreur création" }, { status: 500 });
  }
}

// ==========================================
// 3. PUT : RÉSOUDRE / UPDATE un incident
// ==========================================
export async function PUT(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { id, status, finalCost } = body; 

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // Vérification d'appartenance
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { property: true } 
    });

    if (!incident) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (incident.property.ownerId !== userId) return NextResponse.json({ error: "Interdit" }, { status: 403 });

    // Mise à jour
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: status || incident.status, // Permet de changer juste le statut
        finalCost: finalCost ? parseInt(finalCost) : incident.finalCost,
      }
    });

    return NextResponse.json({ success: true, incident: updated });

  } catch (error) {
    console.error("PUT Incident Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
