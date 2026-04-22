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
      
      const res = await api.get<DashboardResponse>('/owner/dashboard', { signal });
      
      if (res.data.success) {
        setData(res.data);
        setError(null);
      } else {
        setError("Erreur API : Données non validées.");
      }
      setLoading(false); // ✅ Déplacé ici (Succès)

    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'CanceledError' || err.name === 'AbortError')) {
        return; // ✅ L'annulation stoppe tout, sans passer loading à false
      }

      console.error("[DASHBOARD_FETCH_ERROR]", err);
      
      const errorResponse = (err as { response?: { status?: number, data?: { error?: string } } }).response;
      
      if (errorResponse?.status === 401 || errorResponse?.status === 403) {
         router.push("/login");
      } else {
         setError(errorResponse?.data?.error || "Impossible de charger les données.");
      }
      setLoading(false); // ✅ Déplacé ici (Vraie Erreur)
    }
    // ❌ Plus de bloc 'finally'
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
