import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { v2 as cloudinary } from "cloudinary";

export async function POST(req: Request) {
  const body = await req.json();
  const { paramsToSign } = body;

  try {
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );
    
    return NextResponse.json({ signature });
  } catch (error) {
    return NextResponse.json({ error: "Signature failed" }, { status: 500 });
  }
}
