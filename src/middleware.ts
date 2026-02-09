import NextAuth from "next-auth";
import authConfig from "@/auth.config"; // Assurez-vous d'avoir ce fichier (ou pointez vers votre config auth)
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 1. INITIALISATION DU RATE LIMITER (Sécurisé)
// On utilise une fenêtre glissante : 20 requêtes toutes les 10 secondes par IP.
let ratelimit: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "10 s"), // Ajustable selon vos besoins
      analytics: true,
    });
  }
} catch (e) {
  console.warn("⚠️ Rate Limiting désactivé (Redis non configuré)");
}

const { auth } = NextAuth(authConfig);

// Routes publiques (Accessibles sans login)
const PUBLIC_ROUTES = [
  '/', '/pricing', '/search', '/properties', '/login', '/register', '/auth/error',
  '/api/webhooks/cinetpay', '/api/webhooks/stripe' // ✅ Toujours ouvert pour les paiements
];

// @ts-ignore
export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // @ts-ignore
  const userRole = req.auth?.user?.role; 
  const path = nextUrl.pathname;
  
  // Récupération IP (Support Vercel/Proxy)
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // ============================================================
  // 🛡️ 1. SÉCURITÉ : RATE LIMITING (Protection DDoS / BruteForce)
  // ============================================================
  
  // On ne limite pas les fichiers statiques (_next, images) pour la performance
  const isStatic = path.startsWith("/_next") || path.includes(".");
  
  if (ratelimit && !isStatic) {
    // On cible spécifiquement les routes sensibles (API, Login, Register)
    const isSensitive = path.startsWith("/api") || path.startsWith("/login") || path.startsWith("/register");
    
    if (isSensitive) {
      // Identifiant unique : "ratelimit_middleware_" + IP
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_middleware_${ip}`);
      
      // Si la limite est dépassée -> Erreur 429 (Too Many Requests)
      if (!success) {
        return new NextResponse("Trop de requêtes. Veuillez patienter.", {
            status: 429,
            headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString()
            }
        });
      }
    }
  }

  // ============================================================
  // 👤 2. AUTHENTIFICATION & RÔLES (Navigation)
  // ============================================================

  const isApiAuthRoute = path.startsWith('/api/auth');
  const isPublicRoute = PUBLIC_ROUTES.some(route => path === route || path.startsWith('/api/webhooks'));

  if (isApiAuthRoute || isPublicRoute) return NextResponse.next();

  // Si pas connecté -> Redirection vers Login
  if (!isLoggedIn) {
    let callbackUrl = path;
    if (nextUrl.search) callbackUrl += nextUrl.search;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl));
  }

  // Gatekeeper par Rôle (Protection des Dashboards)
  if (isLoggedIn && userRole) {
    if (path.startsWith('/dashboard/agent') && userRole !== 'AGENT' && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    if (path.startsWith('/dashboard/owner') && userRole !== 'OWNER' && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    if (path.startsWith('/dashboard/tenant') && userRole !== 'TENANT' && userRole !== 'SUPER_ADMIN') {
       return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }
  
  return NextResponse.next();
});

export const config = {
  // Matcher optimisé pour ignorer les fichiers statiques
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/dashboard/:path*'],
};
