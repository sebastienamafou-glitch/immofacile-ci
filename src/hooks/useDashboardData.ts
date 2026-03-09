import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api"; 
import type { DashboardResponse } from "@/schemas/dashboard.schema"; 

export function useDashboardData() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      
      // L'instance 'api' transmet automatiquement les cookies de session.
      const res = await api.get<DashboardResponse>('/owner/dashboard', { signal });
      
      if (res.data.success) {
        setData(res.data);
        setError(null);
      } else {
        setError("Erreur API : Données non validées.");
      }

    } catch (err: unknown) {
      // Ignorer l'erreur si elle résulte de l'annulation de la requête (démontage UI)
      if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) {
        return;
      }

      console.error("[DASHBOARD_FETCH_ERROR]", err);
      
      // Vérification sécurisée de la structure d'erreur (évite le 'any')
      const errorResponse = (err as { response?: { status?: number, data?: { error?: string } } }).response;
      
      if (errorResponse?.status === 401 || errorResponse?.status === 403) {
         router.push("/login");
      } else {
         setError(errorResponse?.data?.error || "Impossible de charger les données.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    
    // Transmission du signal pour l'annulation
    fetchData(controller.signal);

    // Fonction de nettoyage exécutée au démontage du composant
    return () => controller.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData() };
}
