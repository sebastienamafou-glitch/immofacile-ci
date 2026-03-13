"use client";

import Swal from "sweetalert2";
import { signOut } from "next-auth/react";
import { Server, Megaphone, LogOut } from "lucide-react";
import { api } from "@/lib/api";

export default function HeaderWarRoom() {
  
  const handleBroadcast = () => {
    Swal.fire({
      title: '📢 CENTRE DE DIFFUSION',
      html: `
        <div class="text-left space-y-4 font-sans text-sm p-2">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Cible</label>
            <select id="swal-target" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
              <option value="ALL">Tout le monde (Global)</option>
              <option value="TENANTS">Locataires uniquement</option>
              <option value="OWNERS">Propriétaires & Agences</option>
              <option value="INVESTORS">Investisseurs</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                <select id="swal-type" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
                  <option value="INFO">Information 🔵</option>
                  <option value="WARNING">Alerte 🔴</option>
                  <option value="SUCCESS">Succès 🟢</option>
                  <option value="ERROR">Urgence 🚨</option>
                </select>
             </div>
             <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Titre</label>
                <input id="swal-title" placeholder="Ex: Maintenance" class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:border-orange-500 transition">
             </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Message</label>
            <textarea id="swal-message" placeholder="Votre message..." class="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 h-24 outline-none focus:border-orange-500 transition"></textarea>
          </div>
        </div>
      `,
      background: '#0F172A', color: '#fff',
      showCancelButton: true,
      confirmButtonText: 'Envoyer maintenant',
      confirmButtonColor: '#F59E0B',
      cancelButtonText: 'Annuler',
      cancelButtonColor: '#334155',
      customClass: { popup: 'rounded-[2rem] border border-slate-700' },
      preConfirm: () => {
        return {
          // ✅ CORRECTION : 'target' au lieu de 'targetRole' pour matcher Zod
          target: (document.getElementById('swal-target') as HTMLSelectElement).value,
          type: (document.getElementById('swal-type') as HTMLSelectElement).value,
          title: (document.getElementById('swal-title') as HTMLInputElement).value,
          message: (document.getElementById('swal-message') as HTMLTextAreaElement).value
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // ✅ CORRECTION : Nouvelle URL de l'API
          const res = await api.post('/superadmin/notifications/send', result.value);
          
          if (res.data.success) {
              Swal.fire({
                 icon: 'success', 
                 title: 'Diffusion Réussie', 
                 text: `${res.data.count} utilisateurs ont reçu la notification.`,
                 background: '#0F172A', color: '#fff',
                 confirmButtonColor: '#10B981'
              });
          }
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'Erreur', text: "Échec de l'envoi", background: '#0F172A', color: '#fff' });
        }
      }
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
      <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20 border border-white/10">
                  <Server className="text-white w-5 h-5" />
              </div>
              <div>
                  <h1 className="font-black text-white text-lg tracking-tight uppercase">Babimmo <span className="text-orange-500">War Room</span></h1>
                  <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Système Opérationnel</p>
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-4">
              <button 
                  onClick={handleBroadcast}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition border border-slate-700 hover:border-slate-600"
              >
                  <Megaphone className="w-4 h-4 text-orange-500" /> <span className="hidden sm:inline">Envoyer Alertes</span>
              </button>

              <div className="h-8 w-[1px] bg-slate-800"></div>

              <button onClick={() => signOut({ callbackUrl: '/' })} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 group" title="Déconnexion">
                  <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
      </div>
    </header>
  );
}
