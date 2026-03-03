import { NextResponse } from "next/server";
import { logActivity } from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const { propertyId } = await req.json();
        
        if (!propertyId) {
            return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });
        }

        // On enregistre le clic dans ta table d'audit
        await logActivity({
            action: "GHOST_LINK_CLICKED" as any,
            entityId: propertyId,
            entityType: "PROPERTY",
            metadata: { source: "WhatsApp/Facebook Growth Hack" }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
    }
}
