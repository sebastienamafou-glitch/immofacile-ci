import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
    UserCheck, Clock, CheckCircle, XCircle, 
    FileText, MapPin, Eye, Building2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic';

export default async function AgencyCandidatesPage() {
  const session = await auth();
  if (!session?.user?.agencyId) return redirect("/dashboard/agency");

  // 1. Récupération des candidatures pour les biens de cette agence
  const applications = await prisma.application.findMany({
    where: {
      property: { agencyId: session.user.agencyId }
    },
    include: {
      property: { select: { title: true, commune: true, price: true } },
      applicant: { select: { name: true, email: true, phone: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <UserCheck className="text-orange-500 w-8 h-8" />
            Dossiers de Candidature
          </h1>
          <p className="text-slate-400 mt-2">
            Gérez les locataires potentiels pour vos biens en gestion.
          </p>
        </div>
      </div>

      {/* LISTE DES DOSSIERS */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {applications.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center">
               <FileText className="w-16 h-16 text-slate-700 mb-4" />
               <h3 className="text-xl font-bold text-white mb-2">Aucune candidature</h3>
               <p className="text-slate-400">Dès qu'un client postulera à l'un de vos biens, son dossier apparaîtra ici.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-bold tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5">Candidat</th>
                  <th className="px-6 py-5">Bien concerné</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Statut</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                    
                    {/* CANDIDAT */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-base">{app.applicant.name || "Client Anonyme"}</span>
                        <span className="text-xs text-slate-500">{app.applicant.phone || app.applicant.email}</span>
                      </div>
                    </td>

                    {/* BIEN */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200 line-clamp-1">{app.property.title}</span>
                        <span className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {app.property.commune}
                        </span>
                      </div>
                    </td>

                    {/* DATE */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                      {new Date(app.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* STATUT */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.status === 'PENDING' && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3 mr-1"/> Nouveau</Badge>}
                      {app.status === 'REVIEWING' && <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20"><Eye className="w-3 h-3 mr-1"/> En analyse</Badge>}
                      {app.status === 'ACCEPTED' && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1"/> Retenu</Badge>}
                      {app.status === 'REJECTED' && <Badge className="bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3 mr-1"/> Refusé</Badge>}
                    </td>

                    {/* ACTION */}
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/agency/candidates/${app.id}`}>
                        <button className="bg-white/5 hover:bg-orange-500 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-white/10 hover:border-orange-500 shadow-sm">
                          Analyser
                        </button>
                      </Link>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
