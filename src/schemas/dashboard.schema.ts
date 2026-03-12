import { z } from "zod";

export const DashboardResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(), // Corrigé pour correspondre à Prisma (peut être null)
    role: z.string(),
    walletBalance: z.number(),
    isVerified: z.boolean(),
  }),
  stats: z.object({
    totalProperties: z.number(),
    occupancyRate: z.number(),
    monthlyIncome: z.number(),
    activeIncidentsCount: z.number(),
    totalExpenses: z.number(),
    netIncomeYTD: z.number(),
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
    // ✅ DÉCLARATION STRICTE DES BAUX ET PAIEMENTS (Pour le Hub et les Locataires)
    leases: z.array(z.object({
      id: z.string(),
      monthlyRent: z.number(),
      isActive: z.boolean(),
      startDate: z.union([z.date(), z.string()]).optional(),
      tenant: z.object({
        id: z.string().optional(),
        name: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        isVerified: z.boolean().optional(),
      }).nullable(),
      payments: z.array(z.object({
        id: z.string(),
        amount: z.number(),
        date: z.union([z.date(), z.string()]),
        status: z.string(),
      })).optional()
    })).default([]),
  })),
  // ✅ FIN DU z.any() : TYPAGE STRICT DU COURT SÉJOUR
  listings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    pricePerNight: z.number(),
    isPublished: z.boolean(),
    images: z.array(z.string()),
  })),
  bookings: z.array(z.object({
    id: z.string(),
    startDate: z.union([z.date(), z.string()]),
    endDate: z.union([z.date(), z.string()]),
    status: z.string(),
    guest: z.object({
      name: z.string().nullable(),
      phone: z.string().nullable()
    }).nullable().optional(),
    listing: z.object({
      title: z.string()
    }).optional()
  })),
  artisans: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    job: z.string(),
  }))
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
