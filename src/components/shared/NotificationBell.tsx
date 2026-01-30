"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 1. CHARGEMENT DU RADAR
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (e) {
      console.error("Erreur radar", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optionnel : Polling toutes les 30 sec pour vérifier les nouveaux ordres
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. MARQUER COMME LU
  const markAsRead = async (id: string, link?: string) => {
    try {
      await api.put('/notifications', { id });
      // Mise à jour locale optimiste
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (link) {
          setIsOpen(false);
          router.push(link);
      }
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications', { id: 'ALL' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  // Icône selon le type d'alerte
  const getIcon = (type: string) => {
    switch(type) {
        case 'WARNING': return <AlertTriangle className="w-4 h-4 text-red-500" />;
        case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BOUTON CLOCHE */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-white"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse border border-slate-900">
            {unreadCount}
          </span>
        )}
      </button>

      {/* LISTE DÉROULANTE */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Centre de Notifications</h3>
            {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3"/> Tout lire
                </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                    key={notif.id} 
                    onClick={() => markAsRead(notif.id, notif.link)}
                    className={`p-4 border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/50 transition flex gap-3 ${!notif.isRead ? 'bg-slate-800/20' : ''}`}
                >
                  <div className={`mt-1 p-2 rounded-full h-fit bg-slate-900 border border-slate-700`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-bold ${!notif.isRead ? 'text-white' : 'text-slate-400'}`}>{notif.title}</h4>
                        {!notif.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 mt-1"></span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                    <span className="text-[10px] text-slate-600 mt-2 block font-mono">
                        {new Date(notif.createdAt).toLocaleDateString()} à {new Date(notif.createdAt).toLocaleTimeString().slice(0,5)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                <p className="text-xs">Aucune notification.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
