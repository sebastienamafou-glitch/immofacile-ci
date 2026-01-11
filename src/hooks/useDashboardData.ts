import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import { DashboardData } from "@/types/dashboard"; 

export function useDashboardData() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. SÉCURITÉ : Récupération de l'utilisateur stocké
      const storedUserRaw = localStorage.getItem("immouser");
      
      if (!storedUserRaw) {
        // Pas connecté ? On redirige et on stop
        router.push("/login"); 
        return;
      }

      const user = JSON.parse(storedUserRaw);

      // 2. Appel API avec le HEADER D'AUTHENTIFICATION
      // C'est ici que ça bloquait : on injecte l'email pour que le serveur nous reconnaisse
      const res = await api.get('/owner/dashboard', {
        headers: {
            'x-user-email': user.email 
        }
      });
      
      if (res.data.success) {
        setData(res.data);
        setError(null);
      } else {
        setError("Erreur API : Données non validées.");
      }

    } catch (err: any) {
      console.error("Erreur chargement dashboard:", err);
      
      // Gestion spécifique : Si 401 (Non autorisé), on force la déconnexion
      if (err.response?.status === 401) {
         router.push("/login");
      } else {
         setError(err.response?.data?.error || "Impossible de charger les données.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
