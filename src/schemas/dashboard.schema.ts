import { z } from "zod";

export const DashboardResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    role: z.string(),
    walletBalance: z.number(),
    isVerified: z.boolean(), // Ajout requis par le front-end
  }),
  stats: z.object({
    totalProperties: z.number(),
    occupancyRate: z.number(),
    monthlyIncome: z.number(),
    activeIncidentsCount: z.number(),
  }),
  properties: z.array(z.object({
    id: z.string(),
    title: z.string(),
    address: z.string(),
    isPublished: z.boolean(),
    price: z.number(),
    commune: z.string().nullable(),
    images: z.array(z.string()),
    bedrooms: z.number().nullable(),
    bathrooms: z.number().nullable(),
    surface: z.number().nullable(),
    type: z.string(),
    isAvailable: z.boolean(),
  })),
  listings: z.array(z.any()), // À typer strictement selon ton modèle Akwaba
  bookings: z.array(z.any()), // À typer strictement
  artisans: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    job: z.string(),
  }))
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
