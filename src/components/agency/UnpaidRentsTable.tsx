"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, AlertCircle, Loader2, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { sendManualRentReminderAction } from "@/app/dashboard/agency/wallet/actions";

interface UnpaidSchedule {
  id: string;
  amount: number;
  expectedDate: Date;
  status: string;
  reminderCount?: number;           // NOUVEAU
  lastReminderAt?: string | null;   // NOUVEAU
  lease: {
    property: { title: string };
    tenant: { name: string | null; phone: string | null; email: string | null };
  };
}

export default function UnpaidRentsTable({ schedules }: { schedules: UnpaidSchedule[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (schedules.length === 0) {
    return (
      <div className="bg-slate-900/40 border-2 border-dashed border-emerald-500/20 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-emerald-500" />
        </div>
        <h3 className="text-emerald-400 font-bold text-lg">Aucun retard de paiement</h3>
        <p className="text-slate-500 text-sm mt-1">Tous les loyers de vos locataires sont à jour.</p>
      </div>
    );
  }

  const handleRemind = async (scheduleId: string) => {
    setLoadingId(scheduleId);
    try {
      const res = await sendManualRentReminderAction(scheduleId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Relance effectuée", { description: res.message });
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleWhatsApp = (phone: string | null, amount: number, propertyTitle: string, expectedDate: Date) => {
    if (!phone) {
      toast.error("Numéro indisponible", { description: "Ce locataire n'a pas de numéro de téléphone renseigné." });
      return;
    }
    
    const formattedDate = new Date(expectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const message = `Bonjour, sauf erreur de notre part, nous sommes en attente de votre loyer de ${amount.toLocaleString()} FCFA pour "${propertyTitle}" (Mois de ${formattedDate}). Merci de régulariser la situation dès que possible. Cordialement.`;
    
    const link = createWhatsAppLink(phone, message);
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <AlertCircle className="text-red-500" /> Retards & Impayés
      </h3>
      
      <div className="grid gap-4">
        {schedules.map((schedule) => {
          const tenant = schedule.lease.tenant;
          const isLate = new Date(schedule.expectedDate) < new Date();
          const isActionLoading = loadingId === schedule.id;
          const hasBeenReminded = (schedule.reminderCount || 0) > 0;

          return (
            <div key={schedule.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-700">
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-lg">{tenant.name || "Locataire Inconnu"}</h4>
                  {isLate && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-500 uppercase tracking-widest border border-red-500/20">
                      En retard
                    </span>
                  )}
                  {/* NOUVEAU : BADGE DE SUIVI */}
                  {hasBeenReminded && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-500/10 text-orange-400 uppercase tracking-widest border border-orange-500/20 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      {schedule.reminderCount} Relance{schedule.reminderCount! > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-slate-400 font-medium">
                  {schedule.lease.property.title}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> 
                    Attendu le {new Date(schedule.expectedDate).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">
                    {schedule.amount.toLocaleString()} FCFA
                  </span>
                  {/* NOUVEAU : TEXTE DE DERNIÈRE ACTION */}
                  {schedule.lastReminderAt && (
                    <span className="text-orange-400/80 italic">
                      Dernière relance le {new Date(schedule.lastReminderAt).toLocaleDateString('fr-FR')} à {new Date(schedule.lastReminderAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex w-full md:w-auto items-center gap-2 mt-4 md:mt-0">
                <Button 
                  onClick={() => handleWhatsApp(tenant.phone, schedule.amount, schedule.lease.property.title, schedule.expectedDate)}
                  className="flex-1 md:flex-none bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 font-bold"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
                
                <Button 
                  onClick={() => handleRemind(schedule.id)}
                  disabled={isActionLoading}
                  variant={hasBeenReminded ? "outline" : "default"}
                  className={`flex-1 md:flex-none font-bold transition-transform active:scale-95 ${
                    hasBeenReminded 
                    ? "border-orange-600 text-orange-500 hover:bg-orange-600/10" 
                    : "bg-orange-600 hover:bg-orange-500 text-white"
                  }`}
                >
                  {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  {isActionLoading ? "Envoi..." : (hasBeenReminded ? "Relancer à nouveau" : "Relancer")}
                </Button>
              </div>
              
            </div>
          );
        })}
      </div>
    </div>
  );
}
