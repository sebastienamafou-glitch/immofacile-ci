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
  console.warn("⚠️ Rate Limiting désactivé (Redis non configuré)");
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
  // 🚨 0. URGENCE SEO : REDIRECTION 301 STRICTE (Google Fix)
  // ============================================================
  // On force le code 301 pour satisfaire la Search Console
  const hostname = req.headers.get("host");
  if (hostname === "immofacile-ci.vercel.app") {
    const newUrl = new URL(`https://www.immofacile.ci${path}${nextUrl.search}`);
    return NextResponse.redirect(newUrl, { status: 301 });
  }

  // Récupération IP
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // ============================================================
  // 🛡️ 1. SÉCURITÉ : RATE LIMITING
  // ============================================================
  const isStatic = path.startsWith("/_next") || path.includes(".");
  
  if (ratelimit && !isStatic) {
    const isSensitive = path.startsWith("/api") || path.startsWith("/login") || path.startsWith("/register");
    if (isSensitive) {
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_middleware_${ip}`);
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
  // 👤 2. AUTHENTIFICATION & RÔLES
  // ============================================================
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
