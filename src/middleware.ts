import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// ✅ IMPORT CRUCIAL : C'est lui qui fait le pont avec NextAuth
import { getToken } from 'next-auth/jwt'; 

// ZONES PROTÉGÉES
const PROTECTED_PATHS = [
  '/dashboard',      
  '/api/superadmin', 
  '/api/owner',      
  '/api/tenant',     
  '/api/agent',      
  '/api/artisan',    
  '/api/kyc',        
  '/api/upload',     
  '/api/leases',     
  '/api/incidents',  
  '/api/settings',  
  '/api/payment',
  '/api/profile',
  '/api/guest',
  '/api/akwaba',
  '/api/auth/me'
];

// EXCEPTIONS PUBLIQUES (Webhooks + Auth)
const PUBLIC_EXCEPTIONS = [
  '/api/payment/webhook',
  '/api/payment/callback',
  '/api/auth' // ✅ Indispensable pour laisser passer le login
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Laisser passer les exceptions publiques
  if (PUBLIC_EXCEPTIONS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Vérifier si la route est protégée
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (isProtected) {
    // ✅ LE CORRECTIF EST ICI
    // Au lieu de chercher 'token' manuellement, on utilise getToken.
    // Il détecte automatiquement le cookie "next-auth.session-token"
    // et le décrypte avec le NEXTAUTH_SECRET défini dans Vercel.
    const session = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
    });

    // Si pas de session valide NextAuth -> Redirection Login
    if (!session) {
      if (pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // ✅ SÉCURITÉ : On propage l'identité validée vers l'API
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-email', session.email as string);
    requestHeaders.set('x-user-role', session.role as string); 
    requestHeaders.set('x-user-id', session.id as string);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

// Optimisation des performances (ne pas exécuter sur les images/static)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|logo.png).*)',
  ],
};
