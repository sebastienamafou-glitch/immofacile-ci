import { auth } from "@/auth"; // ✅ Import Auth
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatWindow from "@/components/guest/ChatWindow";
import { MapPin, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function ConversationPage({ params }: PageProps) {
  // 1. Récupération Session Sécurisée
  const session = await auth();
  const userEmail = session?.user?.email;

  if (!userEmail) {
    redirect("/login?callbackUrl=/dashboard/guest/inbox");
  }

  const currentUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!currentUser) redirect("/login");

  // 2. Récupération Conversation avec les relations du Schema
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

  // 3. Gestion des erreurs et de la sécurité
  if (!conversation) {
    return <div className="p-10 text-white">Conversation introuvable.</div>;
  }

  // Dans votre schema, guest et host sont optionnels (User?). On doit gérer le cas null.
  if (!conversation.guest || !conversation.host) {
      return (
        <div className="p-10 flex flex-col items-center justify-center text-slate-400 h-[50vh]">
            <AlertCircle className="w-10 h-10 mb-4 text-orange-500"/>
            <p>Impossible de charger les participants de cette conversation.</p>
        </div>
      );
  }
  
  // Vérification stricte des droits d'accès
  const isGuest = conversation.guest.id === currentUser.id;
  const isHost = conversation.host.id === currentUser.id;

  if (!isGuest && !isHost) {
    return <div className="p-10 text-red-500">Accès non autorisé à cette conversation.</div>;
  }

  // Déterminer qui est l'interlocuteur
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
        
        {/* Affichage du bien lié (Si présent dans la conversation) */}
        {conversation.listing && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 pr-4 rounded-lg overflow-hidden">
                <div className="w-12 h-12 relative bg-slate-800">
                    {conversation.listing.images && conversation.listing.images[0] ? (
                        <Image 
                            src={conversation.listing.images[0]} 
                            alt="Bien" 
                            fill
                            className="object-cover" 
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-700" />
                    )}
                </div>
                <div>
                    <h3 className="text-white text-sm font-bold truncate max-w-[200px]">
                        {conversation.listing.title}
                    </h3>
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

        {/* SIDEBAR INFO HÔTE */}
        <div className="hidden lg:block space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                    À propos de {isGuest ? "l'hôte" : "l'invité"}
                </h4>
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 relative mb-3">
                        <Image 
                            src={otherUser.image || "https://ui-avatars.com/api/?background=random"} 
                            fill
                            className="rounded-full border-4 border-slate-800 object-cover"
                            alt="Avatar"
                        />
                    </div>
                    <p className="text-white font-bold text-lg">{otherUser.name}</p>
                    <p className="text-slate-500 text-sm">Membre ImmoFacile</p>
                    
                    <div className="mt-6 w-full pt-6 border-t border-slate-800 flex justify-between text-sm">
                         <span className="text-slate-400">Réponse moy.</span>
                         <span className="text-white">~1 heure</span>
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
