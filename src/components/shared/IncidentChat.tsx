"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role?: string };
}

export default function IncidentChat({ incidentId, currentUserId }: { incidentId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. CHARGEMENT & POLLLING (Temps réel simulé)
  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/incident/${incidentId}`);
      if (res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (e) { console.error("Chat error", e); }
  };

  // Rafraîchir toutes les 3 secondes
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [incidentId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 2. ENVOI
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    // Optimistic UI (On affiche tout de suite pour fluidité)
    const tempMsg = {
        id: Date.now().toString(),
        content: newMessage,
        createdAt: new Date().toISOString(),
        sender: { id: currentUserId, name: "Moi" }
    };
    setMessages([...messages, tempMsg]);
    setNewMessage("");
    setSending(true);

    try {
        await api.post(`/chat/incident/${incidentId}`, { content: tempMsg.content });
        fetchMessages(); // Sync réelle
    } catch (e) {
        toast.error("Erreur d'envoi");
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* HEADER */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            Messagerie Directe - Dossier #{incidentId.substring(0,6)}
        </div>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B1120]">
            {messages.length === 0 ? (
                <div className="text-center text-slate-600 text-sm mt-10">
                    Démarrez la conversation...
                </div>
            ) : (
                messages.map((msg) => {
                    const isMe = msg.sender.id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                {!isMe && <div className="text-[10px] text-orange-500 font-bold mb-1">{msg.sender.name}</div>}
                                {msg.content}
                                <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={scrollRef} />
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez votre message..."
                className="bg-slate-950 border-slate-800 text-white focus:border-blue-500"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()} size="icon" className="bg-blue-600 hover:bg-blue-500">
                {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            </Button>
        </form>
    </div>
  );
}
