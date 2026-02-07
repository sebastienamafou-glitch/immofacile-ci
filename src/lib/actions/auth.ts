'use server';

import { signOut } from "@/auth"; // Importe ta config NextAuth principale

export async function logoutUser() {
  // ✅ Utilise la méthode native de NextAuth
  // Elle nettoie tous les cookies de session (CSRF, Session Token, Callback URL)
  // et gère la redirection.
  await signOut({ redirectTo: "/login" });
}
