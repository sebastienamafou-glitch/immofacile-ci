'use client';

import { LogOut } from "lucide-react";
import { logoutUser } from "@/lib/actions/auth"; // Import de l'action créée ci-dessus
import { toast } from "sonner";

export default function LogoutButton() {
  const handleLogout = async () => {
    toast.loading("Déconnexion en cours...");
    await logoutUser();
  };

  return (
    <button 
        onClick={handleLogout}
        className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 transition group"
        title="Se déconnecter"
    >
        <LogOut className="w-5 h-5" />
    </button>
  );
}
