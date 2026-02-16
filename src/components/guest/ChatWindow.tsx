"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/actions/messages"; // ✅ Import de la Server Action

// On définit une interface locale pour éviter les conflits de types Prisma côté client
interface MessageDisplay {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date | string; // Accepte les dates brutes ou objets
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: any[]; // On assouplit le type pour accepter les données sérialisées
  otherUser: {
    name: string | null;
    image: string | null;
  };
}

export default function ChatWindow({ conversationId, currentUserId, initialMessages, otherUser }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageDisplay[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage; // Copie pour l'envoi
    setNewMessage(""); // Vide l'input immédiatement (UX fluide)
    setIsSending(true);

    try {
      // ✅ Appel direct à la Server Action
      const result = await sendMessage(conversationId, messageContent);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Erreur inconnue");
      }

      // Mise à jour de l'interface avec le vrai message retourné par la DB
      setMessages((prev) => [...prev, result.data as MessageDisplay]);
      
      // Rafraîchir les données serveur (ex: pour mettre à jour la liste des conversations à gauche)
      router.refresh(); 
      
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'envoyer le message.");
      setNewMessage(messageContent); // Restaure le message en cas d'erreur
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur flex items-center gap-3">
        <Avatar className="border border-slate-700">
          <AvatarImage src={otherUser.image || undefined} />
          <AvatarFallback className="bg-slate-800 text-slate-400">
             {otherUser.name?.charAt(0) || <User size={16} />}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-white font-bold text-sm">{otherUser.name || "Utilisateur"}</p>
          <div className="flex items-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <p className="text-xs text-emerald-500 font-medium">En ligne</p>
          </div>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-900/50">
        {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                    <User className="text-slate-600" />
                </div>
                <p className="text-sm">Démarrez la conversation avec {otherUser.name}.</p>
            </div>
        ) : (
            messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
                <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    <div
                        className={`px-5 py-3 text-sm shadow-md ${
                        isMe
                            ? "bg-orange-600 text-white rounded-2xl rounded-tr-sm"
                            : "bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700"
                        }`}
                    >
                        {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {format(new Date(msg.createdAt), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
            );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2 items-center">
        <Input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          disabled={isSending}
          className="bg-slate-900 border-slate-800 focus-visible:ring-orange-500 focus-visible:border-orange-500 text-white placeholder:text-slate-600 h-11"
        />
        <Button 
            type="submit" 
            disabled={isSending || !newMessage.trim()}
            className="bg-orange-600 hover:bg-orange-500 text-white h-11 w-11 p-0 shrink-0 rounded-lg transition-all"
        >
          {isSending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={20} />}
        </Button>
      </form>
    </div>
  );
}
