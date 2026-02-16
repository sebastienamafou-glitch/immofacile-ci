import Link from "next/link";
import { auth } from "@/auth"; // ✅ Utilisation de l'auth officielle
import { prisma } from "@/lib/prisma";
import { MessageCircle, User, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { redirect } from "next/navigation";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function GuestInboxPage() {
  // 1. Récupération Session (Correction du bug headers)
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    redirect("/login?callbackUrl=/dashboard/guest/inbox");
  }

  const user = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!user) return null;

  // 2. Récupération des conversations
  // Selon le schema, guestId est optionnel mais ici on cherche celles où on est Guest
  const conversations = await prisma.conversation.findMany({
    where: { guestId: user.id },
    include: {
        host: { select: { name: true, image: true } },
        listing: { select: { title: true } },
        messages: { 
            orderBy: { createdAt: 'desc' },
            take: 1 
        }
    },
    orderBy: { lastMessageAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
       <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-orange-500" /> Messagerie
       </h1>

       {conversations.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
               <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                   <MessageCircle className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-white font-bold text-xl mb-2">Aucun message</h3>
               <p className="text-slate-500 max-w-sm text-center">
                   Contactez un hôte depuis une annonce pour démarrer une conversation.
               </p>
           </div>
       ) : (
           <div className="space-y-4">
               {conversations.map((conv) => (
                   <Link 
                     key={conv.id} 
                     href={`/dashboard/guest/inbox/${conv.id}`}
                     className="block bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:bg-slate-800 hover:border-slate-700 transition group"
                   >
                       <div className="flex items-center gap-4">
                           {/* Avatar Host */}
                           <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600 overflow-hidden relative">
                               {conv.host?.image ? (
                                   <Image 
                                      src={conv.host.image} 
                                      alt="Avatar" 
                                      fill 
                                      className="object-cover"
                                   />
                               ) : (
                                   <span className="font-bold text-white text-lg">
                                       {conv.host?.name ? conv.host.name[0] : <User className="w-6 h-6 text-slate-400"/>}
                                   </span>
                               )}
                           </div>

                           {/* Contenu */}
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-baseline mb-1">
                                   <h4 className="text-white font-bold truncate">
                                       {conv.host?.name || "Utilisateur inconnu"} 
                                       <span className="text-slate-500 font-normal text-sm ml-2">• {conv.listing?.title || "Annonce"}</span>
                                   </h4>
                                   <span className="text-xs text-slate-500 whitespace-nowrap">
                                       {conv.messages[0] && formatDistanceToNow(new Date(conv.messages[0].createdAt), { addSuffix: true, locale: fr })}
                                   </span>
                               </div>
                               <p className="text-slate-400 text-sm truncate group-hover:text-slate-300 transition-colors">
                                   {conv.messages[0]?.content || "Nouvelle conversation"}
                               </p>
                           </div>

                           <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition" />
                       </div>
                   </Link>
               ))}
           </div>
       )}
    </div>
  );
}
