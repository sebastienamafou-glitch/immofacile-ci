import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

// --- HELPER : UPLOAD CLOUDINARY ---
async function uploadToCloudinary(file: File | null) {
  if (!file || file.size === 0) return null;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "immofacile/incidents" },
      (error, result) => {
        if (error) { console.error("Cloudinary Error:", error); resolve(""); } 
        else { resolve(result?.secure_url || ""); }
      }
    );
    const Readable = require("stream").Readable;
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
}

// 1. GET : Lister les incidents
export async function GET(req: Request) {
    try {
        // 🔒 SÉCURITÉ : Session Cookie au lieu de Header
        const session = await auth();
        if (!session || !session.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        
        const userId = session.user.id;
        
        const incidents = await prisma.incident.findMany({
            where: { property: { ownerId: userId } },
            orderBy: [ { status: 'asc' }, { createdAt: 'desc' } ],
            include: { 
                property: { select: { id: true, title: true } }, 
                reporter: { select: { name: true, phone: true, role: true } },
                assignedTo: { select: { id: true, name: true, jobTitle: true, phone: true } }
            }
        });
        
        return NextResponse.json({ success: true, incidents });
    } catch (e) { 
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 }); 
    }
}

// 2. POST : CRÉER UN INCIDENT
export async function POST(req: Request) {
  try {
    // 🔒 SÉCURITÉ
    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = session.user.id;

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const propertyId = formData.get('propertyId') as string;
    const photoFile = formData.get('photo') as File | null;

    if (!title || !propertyId) return NextResponse.json({ error: "Requis" }, { status: 400 });

    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
    if (!property) return NextResponse.json({ error: "Interdit ou bien introuvable" }, { status: 403 });

    let photoUrl = photoFile ? await uploadToCloudinary(photoFile) : null;

    const newIncident = await prisma.incident.create({
        data: {
            title,
            description: description || "",
            status: "OPEN",
            priority: "NORMAL",
            photos: photoUrl ? [photoUrl] : [],
            propertyId: property.id,
            reporterId: userId 
        }
    });

    return NextResponse.json({ success: true, incident: newIncident });
  } catch (error) { return NextResponse.json({ error: "Erreur création" }, { status: 500 }); }
}

// 3. PUT : ASSIGNER & RÉSOUDRE
export async function PUT(req: Request) {
  try {
    // 🔒 SÉCURITÉ
    const session = await auth();
    if (!session || !session.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = session.user.id;

    const body = await req.json();
    const { id, status, finalCost, assignedToId } = body; 

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { property: true } 
    });

    if (!incident || incident.property.ownerId !== userId) return NextResponse.json({ error: "Interdit" }, { status: 403 });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (finalCost !== undefined) updateData.finalCost = parseInt(finalCost);
    
    if (assignedToId) {
        updateData.assignedToId = assignedToId;
        if (incident.status === 'OPEN') {
            updateData.status = 'IN_PROGRESS';
        }
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, incident: updated });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
