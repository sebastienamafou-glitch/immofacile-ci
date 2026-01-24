'use server';

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logoutUser() {
  // 1. Suppression du cookie sécurisé
  cookies().delete('token');
  
  // 2. Redirection vers la page de login
  redirect('/login');
}
