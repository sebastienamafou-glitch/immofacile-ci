import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, Phone, CalendarDays, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = 'force-dynamic';

export default async function AmbassadorLeadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leads = await prisma.lead.findMany({
    where: { agentId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <Users className="text-orange-500 w-8 h-8" />
          Prospects Locataires
        </h1>
        <p className="text-slate-500 mt-2 font-medium">La liste des locataires intéressés par vos annonces.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {leads.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Aucun prospect pour le moment.</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-100">
                {leads.map((lead) => (
                    <div key={lead.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition">
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">{lead.name}</h4>
                            <p className="text-sm font-medium text-slate-500 mt-1">{lead.needs}</p>
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" /> 
                                {format(new Date(lead.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                        </div>
                        
                        <a 
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Bonjour ${encodeURIComponent(lead.name)}, je vous contacte suite à votre demande sur Babimmo pour le bien : ${encodeURIComponent(lead.needs || '')}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full md:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-[#25D366]/20"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="tracking-wide">Contacter</span>
                        </a>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
