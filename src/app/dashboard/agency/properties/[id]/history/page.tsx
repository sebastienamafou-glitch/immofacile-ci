import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PropertyHistoryPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return redirect("/auth/login");

  // 1. SÉCURITÉ : Vérifier que l'agence est propriétaire du bien
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agencyId: true }
  });

  const property = await prisma.property.findFirst({
    where: { id: params.id, agencyId: user?.agencyId },
    select: { id: true, title: true }
  });

  if (!property) return notFound();

  // 2. DATA : Récupérer les Logs liés à ce bien
  // On cherche les logs où entityId = ID du bien OU entityId = ID d'un bail lié (optionnel pour plus tard)
  const logs = await prisma.auditLog.findMany({
    where: {
      entityId: property.id, 
      // Optionnel: filtrer par entityType pour être sûr
      // entityType: "PROPERTY" 
    },
    include: {
      user: { select: { name: true, email: true, image: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50 // Limite de sécurité
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link 
            href={`/dashboard/agency/properties/${property.id}`}
            className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour au bien
        </Link>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Historique des activités</h1>
                <p className="text-muted-foreground">
                    Audit trail immuable pour "{property.title}".
                </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-green-600 opacity-20" />
        </div>
      </div>

      {/* Tableau des Logs */}
      <Card>
        <CardHeader>
            <CardTitle className="text-sm font-medium">Journal des événements (50 derniers)</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Auteur</TableHead>
                        <TableHead className="text-right">Détails (Metadata)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                Aucune activité enregistrée pour ce bien.
                            </TableCell>
                        </TableRow>
                    ) : (
                        logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium text-xs text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {log.action}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm">
                                            {log.user ? log.user.name : (log.userEmail || "Système")}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right max-w-[300px] truncate text-xs text-muted-foreground">
                                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
