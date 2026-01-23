import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatWindow from "@/components/guest/ChatWindow";
import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function ConversationPage({ params }: PageProps) {
  // 1. Récupération User
  const userEmail = headers().get("x-user-email");
  if (!userEmail) redirect("/login");

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!currentUser) redirect("/login");

  // 2. Récupération Conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      guest: { select: { id: true, name: true, image: true } },
      host: { select: { id: true, name: true, image: true } },
      listing: { select: { id: true, title: true, city: true, images: true } },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  // 3. Sécurité (Est-ce que je suis autorisé ?)
  if (!conversation) {
    return <div className="p-10 text-white">Conversation introuvable.</div>;
  }
  
  const isGuest = conversation.guest.id === currentUser.id;
  const isHost = conversation.host.id === currentUser.id;

  if (!isGuest && !isHost) {
    return <div className="p-10 text-red-500">Accès non autorisé à cette conversation.</div>;
  }

  // Déterminer qui est "l'autre"
  const otherUser = isGuest ? conversation.host : conversation.guest;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* HEADER DE NAVIGATION */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/guest/inbox">
            <Button variant="ghost" className="text-slate-400 hover:text-white pl-0 gap-2">
                <ArrowLeft size={18} /> Retour
            </Button>
        </Link>
        {conversation.listing && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 pr-4 rounded-lg overflow-hidden">
                {conversation.listing.images[0] && (
                    <img src={conversation.listing.images[0]} alt="Bien" className="w-12 h-12 object-cover" />
                )}
                <div>
                    <h3 className="text-white text-sm font-bold truncate max-w-[200px]">{conversation.listing.title}</h3>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                        <MapPin size={10} /> {conversation.listing.city}
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* ZONE DE CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <ChatWindow 
                conversationId={conversation.id}
                currentUserId={currentUser.id}
                initialMessages={conversation.messages}
                otherUser={otherUser}
            />
        </div>

        {/* SIDEBAR INFO (Optionnel : Détails Résa) */}
        <div className="hidden lg:block space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">À propos de l'hôte</h4>
                <div className="flex flex-col items-center text-center">
                    <img 
                        src={otherUser.image || "https://ui-avatars.com/api/?background=random"} 
                        className="w-20 h-20 rounded-full mb-3 border-4 border-slate-800"
                    />
                    <p className="text-white font-bold text-lg">{otherUser.name}</p>
                    <p className="text-slate-500 text-sm">Membre ImmoFacile</p>
                    
                    <div className="mt-6 w-full pt-6 border-t border-slate-800 flex justify-between text-sm">
                         <span className="text-slate-400">Réponse moy.</span>
                         <span className="text-white">1 heure</span>
                    </div>
                </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-orange-200 text-xs leading-relaxed">
                <p>🔒 Pour votre sécurité, ne communiquez jamais vos informations personnelles ou bancaires en dehors de la plateforme ImmoFacile.</p>
            </div>
        </div>
      </div>

    </div>
  );
}
