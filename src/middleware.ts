import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'votre_super_secret');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // CIBLAGE : On protège toutes les routes API et Dashboard du locataire
  if (pathname.startsWith('/api/tenant') || pathname.startsWith('/dashboard/tenant')) {
    
    // 1. Si pas de token en cookie -> Dehors
    if (!token) {
      // Si c'est une page, on redirige vers Login
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Si c'est une API, on renvoie 401 JSON
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    try {
      // 2. Vérification cryptographique du token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // 3. INJECTION VITALE : On donne l'email à l'API via les headers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-email', payload.email as string);

      // On laisse passer avec les nouveaux headers
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch (err) {
      // Token invalide -> Dehors
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// CONFIGURATION : C'est ici qu'on définit les routes surveillées
export const config = {
  matcher: [
    '/dashboard/tenant/:path*', // Couvre le dashboard et les sous-pages (KYC, etc.)
    '/api/tenant/:path*'        // Couvre toutes les API locataires
  ],
};
