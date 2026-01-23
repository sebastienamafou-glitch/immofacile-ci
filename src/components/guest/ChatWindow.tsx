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

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  otherUser: {
    name: string | null;
    image: string | null;
  };
}

export default function ChatWindow({ conversationId, currentUserId, initialMessages, otherUser }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas à l'ouverture ou au nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: newMessage }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Mise à jour Optimiste (ou via la réponse API)
      setMessages((prev) => [...prev, {
        ...data.message,
        createdAt: new Date() // Pour éviter les soucis de format date string/obj
      }]);
      
      setNewMessage("");
      router.refresh(); // Rafraîchit les données serveur en arrière-plan
    } catch (error) {
      toast.error("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={otherUser.image || undefined} />
          <AvatarFallback className="bg-slate-800 text-slate-400">
             {otherUser.name?.charAt(0) || <User size={16} />}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-white font-bold text-sm">{otherUser.name || "Utilisateur"}</p>
          <p className="text-xs text-emerald-500 font-medium">En ligne</p>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
            <div className="text-center text-slate-500 mt-10 text-sm">
                Démarrez la conversation avec {otherUser.name}.
            </div>
        ) : (
            messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    isMe
                        ? "bg-orange-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-200 rounded-tl-none"
                    }`}
                >
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? "text-orange-200" : "text-slate-500"}`}>
                        {format(new Date(msg.createdAt), "HH:mm", { locale: fr })}
                    </p>
                </div>
                </div>
            );
            })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
        <Input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          className="bg-slate-900 border-slate-800 focus:border-orange-500 text-white"
        />
        <Button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            className="bg-orange-600 hover:bg-orange-500 text-white"
        >
          {sending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={18} />}
        </Button>
      </form>
    </div>
  );
}
