"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  Wallet, TrendingUp, Download, 
  CreditCard, Loader2, FileText, CheckCircle2 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Swal from "sweetalert2"; // Import nécessaire pour la modale

interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  location: string;
  status: string;
}

export default function ArtisanFinancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0,
    totalEarnings: 0,
    pendingJobs: 0,
    history: [] as Transaction[]
  });

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
      try {
          const res = await api.get('/artisan/finance');
          setData(res.data);
      } catch (e) {
          console.error(e);
          toast.error("Impossible de charger les données financières.");
      } finally {
          setLoading(false);
      }
  };

  // --- FONCTIONNALITÉ COMPLÈTE DE RETRAIT ---
  const handleWithdraw = async () => {
    // 1. Formulaire Modale
    const { value: formValues } = await Swal.fire({
        title: 'Retrait de Fonds 💸',
        html: `
            <div class="flex flex-col gap-3 text-left text-sm">
                <label>Montant à retirer (FCFA)</label>
                <input id="swal-amount" type="number" class="swal2-input m-0 w-full bg-slate-800 text-white border-slate-600 focus:border-emerald-500" placeholder="Ex: 25000" min="500">
                
                <label class="mt-2">Moyen de paiement</label>
                <select id="swal-method" class="swal2-select m-0 w-full bg-slate-800 text-white border-slate-600 focus:border-emerald-500 display-block">
                    <option value="WAVE">Wave</option>
                    <option value="OM">Orange Money</option>
                    <option value="MTN">MTN Money</option>
                </select>

                <label class="mt-2">Numéro de téléphone</label>
                <input id="swal-phone" type="tel" class="swal2-input m-0 w-full bg-slate-800 text-white border-slate-600 focus:border-emerald-500" placeholder="07 00 00 00 00">
            </div>
        `,
        footer: `<span class="text-xs text-slate-400">Solde actuel: <b>${data.balance.toLocaleString()} F</b></span>`,
        focusConfirm: false,
        background: '#0f172a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: 'Valider le retrait',
        confirmButtonColor: '#059669',
        cancelButtonText: 'Annuler',
        preConfirm: () => {
            return {
                amount: (document.getElementById('swal-amount') as HTMLInputElement).value,
                method: (document.getElementById('swal-method') as HTMLSelectElement).value,
                number: (document.getElementById('swal-phone') as HTMLInputElement).value,
            }
        }
    });

    if (formValues) {
        // Validation basique
        if (!formValues.amount || !formValues.number) {
            return Swal.fire({ title: 'Erreur', text: 'Tous les champs sont requis', icon: 'error', background: '#0f172a', color: '#fff' });
        }
        if (parseInt(formValues.amount) > data.balance) {
            return Swal.fire({ title: 'Refusé', text: 'Solde insuffisant', icon: 'error', background: '#0f172a', color: '#fff' });
        }

        // 2. Appel API
        try {
            Swal.showLoading();
            const res = await api.post('/artisan/finance/withdraw', {
                amount: parseInt(formValues.amount),
                method: formValues.method,
                number: formValues.number
            });

            if (res.data.success) {
                // Succès : On met à jour l'interface sans recharger
                await Swal.fire({
                    title: 'Retrait initié !',
                    text: `Le transfert de ${parseInt(formValues.amount).toLocaleString()} F vers ${formValues.method} est en cours de traitement.`,
                    icon: 'success',
                    background: '#0f172a', color: '#fff'
                });
                fetchFinance(); // Rafraîchir les données
            }
        } catch (error: any) {
            Swal.fire({ 
                title: 'Erreur', 
                text: error.response?.data?.error || "Échec du retrait", 
                icon: 'error', background: '#0f172a', color: '#fff' 
            });
        }
    }
  };

  if (loading) return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-mono">Chargement des finances...</p>
      </div>
  );

  return (
    <div className="p-6 md:p-10 text-slate-200 font-sans min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-orange-500" /> Mes Finances
              </h1>
              <p className="text-slate-400 text-sm">Suivi de vos revenus et facturations.</p>
          </div>
          <Button 
            onClick={handleWithdraw} 
            disabled={data.balance < 500}
            className={`${data.balance < 500 ? 'bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'} font-bold px-6 py-5 rounded-xl flex items-center gap-2 transition-all`}
          >
              <CreditCard className="w-5 h-5" /> DEMANDER UN RETRAIT
          </Button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* SOLDE DISPO */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="w-24 h-24 text-white"/></div>
              <CardContent className="p-6 relative z-10">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Solde Disponible</p>
                  <p className="text-4xl font-black text-white tracking-tight">
                      {data.balance.toLocaleString()} <span className="text-lg text-slate-500 font-medium">FCFA</span>
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 w-fit px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Prêt à être retiré
                  </div>
              </CardContent>
          </Card>

          {/* TOTAL GAGNÉ */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500"><TrendingUp className="w-6 h-6"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Depuis le début</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Chiffre d'Affaires</p>
                  <p className="text-3xl font-black text-white">{data.totalEarnings.toLocaleString()} F</p>
              </CardContent>
          </Card>

          {/* EN COURS */}
          <Card className="bg-slate-900 border-slate-800 shadow-lg">
              <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><Loader2 className="w-6 h-6"/></div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Potentiel</span>
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Missions en cours</p>
                  <p className="text-3xl font-black text-white">{data.pendingJobs}</p>
              </CardContent>
          </Card>
      </div>

      {/* LISTE DES TRANSACTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Historique des Revenus</h3>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Download className="w-4 h-4 mr-2"/> Exporter CSV
              </Button>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                          <th className="p-4">Désignation</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Lieu</th>
                          <th className="p-4 text-right">Montant</th>
                          <th className="p-4 text-center">Statut</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                      {data.history.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                  Aucune transaction enregistrée.
                              </td>
                          </tr>
                      ) : (
                          data.history.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                                  <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition">
                                              <FileText className="w-4 h-4 text-slate-400" />
                                          </div>
                                          <span className="font-bold text-white">{tx.description}</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-slate-400 font-mono text-xs">
                                      {new Date(tx.date).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-slate-400">
                                      {tx.location}
                                  </td>
                                  <td className="p-4 text-right font-bold text-white font-mono">
                                      {/* Si c'est un retrait, on met un moins en rouge */}
                                      {tx.description.includes('Retrait') ? (
                                          <span className="text-red-400">- {tx.amount.toLocaleString()} F</span>
                                      ) : (
                                          <span className="text-emerald-400">+ {tx.amount.toLocaleString()} F</span>
                                      )}
                                  </td>
                                  <td className="p-4 text-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase border border-emerald-500/20">
                                          SUCCÈS
                                      </span>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
}
