import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 1. INITIALISATION DU RATE LIMITER
let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "10 s"),
      analytics: true,
    });
  }
} catch (e) {
  console.warn("⚠️ Rate Limiting désactivé");
}

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = [
  '/', '/pricing', '/search', '/properties', '/login', '/register', '/auth/error',
  '/api/webhooks/cinetpay', '/api/webhooks/stripe'
];

// @ts-ignore
export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // @ts-ignore
  const userRole = req.auth?.user?.role; 
  const path = nextUrl.pathname;
  
  // ============================================================
  // 🚨 SEO FIX : REDIRECTION 301 VIA HEADER (MÉTHODE BRUTE)
  // ============================================================
  // On lit directement l'en-tête "Host" envoyé par le navigateur.
  // C'est la seule vérité absolue.
  const host = req.headers.get("host");

  if (host && host.includes("immofacile-ci.vercel.app")) {
    // On reconstruit l'URL vers le nouveau domaine
    const targetUrl = new URL(`https://www.immofacile.ci${path}`);
    if (nextUrl.search) targetUrl.search = nextUrl.search;
    
    return NextResponse.redirect(targetUrl, 301);
  }

  // Récupération IP
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // ============================================================
  // 🛡️ SÉCURITÉ & AUTH (Reste du code inchangé)
  // ============================================================
  const isStatic = path.startsWith("/_next") || path.includes(".");
  
  if (ratelimit && !isStatic) {
    const isSensitive = path.startsWith("/api") || path.startsWith("/login") || path.startsWith("/register");
    if (isSensitive) {
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_middleware_${ip}`);
      if (!success) {
        return new NextResponse("Trop de requêtes.", { status: 429 });
      }
    }
  }

  const isApiAuthRoute = path.startsWith('/api/auth');
  const isPublicRoute = PUBLIC_ROUTES.some(route => path === route || path.startsWith('/api/webhooks'));

  if (isApiAuthRoute || isPublicRoute) return NextResponse.next();

  if (!isLoggedIn) {
    let callbackUrl = path;
    if (nextUrl.search) callbackUrl += nextUrl.search;
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl));
  }

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
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)', '/dashboard/:path*'],
};
