// ✅ On importe les bons modèles
import { User, Property } from "@prisma/client"; 

export interface DashboardStats {
  activeIncidentsCount: number;
  [key: string]: any;
}

export interface DashboardData {
  user: User; 
  stats: DashboardStats;
  
  // ✅ CORRECTION : Ce sont des Propriétés, pas des Users
  properties: Property[]; 
  
  artisans: User[];   // Correct (Ce sont des humains)
  tenants?: User[];   // Correct
}

export interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
}
