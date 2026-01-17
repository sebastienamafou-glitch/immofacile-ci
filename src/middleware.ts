import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// 1. SÉCURITÉ : Pas de fallback en prod. Si la clé manque, l'app doit crasher au démarrage.
const JWT_SECRET_STR = process.env.JWT_SECRET;
if (!JWT_SECRET_STR) {
    throw new Error("FATAL: JWT_SECRET manquant dans les variables d'environnement.");
}
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STR);

// 2. LISTE EXHAUSTIVE DES ZONES PROTÉGÉES (Basée sur votre structure de dossiers)
const PROTECTED_PATHS = [
  '/dashboard',      // Le Frontend
  '/api/admin',      // Rôle Admin
  '/api/owner',      // Rôle Owner
  '/api/tenant',     // Rôle Tenant
  '/api/agent',      // Rôle Agent
  '/api/artisan',    // Rôle Artisan (Oublié précédemment)
  '/api/kyc',        // Identité
  '/api/upload',     // Fichiers
  '/api/leases',     // Contrats
  '/api/incidents',  // Signalements
  '/api/settings'    // Paramètres (Si existe)
];

// 3. ROUTES PUBLIQUES SPÉCIFIQUES (Exceptions)
// Les Webhooks de paiement doivent être publics (CinetPay/Wave appellent votre serveur)
const PUBLIC_EXCEPTIONS = [
  '/api/payment/webhook',
  '/api/payment/callback'
];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // A. Vérification Exception Publique (Webhooks)
  if (PUBLIC_EXCEPTIONS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // B. Est-ce une route protégée ?
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (isProtected) {
    
    // 1. Absence de Token
    if (!token) {
      // Si c'est une page (Dashboard), on redirige vers le login
      if (pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', request.url);
        // On peut ajouter ?redirect=... pour renvoyer l'user au bon endroit après login
        return NextResponse.redirect(loginUrl);
      }
      // Si c'est une API, on renvoie une erreur JSON propre
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    try {
      // 2. Vérification Cryptographique du Token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // 3. Injection des Headers (Identity Propagation)
      // C'est grâce à ça que vos API routes (request.headers.get("x-user-email")) fonctionnent !
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-email', payload.email as string);
      requestHeaders.set('x-user-role', payload.role as string); 
      requestHeaders.set('x-user-id', payload.userId as string); // Utile d'avoir l'ID aussi

      return NextResponse.next({
        request: { headers: requestHeaders },
      });

    } catch (err) {
      console.error("Middleware Auth Error:", err);
      // Token invalide, expiré ou falsifié
      
      // Nettoyage du cookie côté client (optionnel mais propre via header)
      const response = pathname.startsWith('/dashboard')
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.json({ error: "Session expirée ou invalide" }, { status: 401 });
      
      response.cookies.delete('token');
      return response;
    }
  }

  // Route publique (Login, Homepage, Landing page...)
  return NextResponse.next();
}

// CONFIGURATION DU MATCHER (Pour ne pas charger le middleware sur les images/css)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|logo.png).*)',
  ],
};
