import { User } from "@prisma/client"; // <--- La magie est ici

export interface DashboardStats {
  activeIncidentsCount: number;
  [key: string]: any;
}

export interface DashboardData {
  user: User; // Fini le 'any', maintenant TypeScript connaît votre DB par cœur !
  stats: DashboardStats;
  properties: User[]; // Vous pouvez aussi importer { Property } from "@prisma/client"
  artisans: User[];   // Idem pour { Artisan }...
  tenants?: User[];
}

export interface ApiResponse {
  success: boolean;
  data: DashboardData;
  message?: string;
}
