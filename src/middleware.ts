import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'votre_super_secret');

// Liste des chemins qui nécessitent une authentification
const PROTECTED_PATHS = [
  '/dashboard',
  '/api/tenant',
  '/api/owner',
  '/api/agent',
  '/api/admin'
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Vérifie si le chemin actuel commence par l'un des chemins protégés
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (isProtected) {
    
    // A. Pas de token ? -> Redirection ou Erreur 401
    if (!token) {
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    try {
      // B. Vérification cryptographique
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // C. Injection de l'identité pour l'API
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-email', payload.email as string);
      // On peut aussi passer le rôle pour gagner du temps, mais l'email suffit pour la DB
      requestHeaders.set('x-user-role', payload.role as string); 

      return NextResponse.next({
        request: { headers: requestHeaders },
      });

    } catch (err) {
      // Token invalide ou expiré
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

// CONFIGURATION GLOBALE
export const config = {
  matcher: [
    // On surveille tout le dashboard et toutes les API métiers
    '/dashboard/:path*',
    '/api/tenant/:path*',
    '/api/owner/:path*',
    '/api/agent/:path*',
    '/api/admin/:path*'
  ],
};
