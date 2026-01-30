"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  ArrowLeft, Plus, Trash2, Calculator, 
  Save, FileText, Calendar, DollarSign, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils"; // Assurez-vous d'avoir cet utilitaire ou créez-le

// TYPES
interface QuoteItem {
  id: string; // Temp ID pour la liste React
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateQuotePage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incident, setIncident] = useState<any>(null);

  // ÉTAT DU DEVIS
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: "Main d'œuvre", quantity: 1, unitPrice: 0 }
  ]);
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(30);

  // 1. CHARGEMENT INCIDENT
  useEffect(() => {
    const fetchIncident = async () => {
      try {
        // On réutilise votre endpoint dashboard ou un endpoint spécifique incident
        // Ici je suppose qu'on peut fetcher l'incident par son ID
        const res = await api.get(`/artisan/incidents/${incidentId}`);
        if (res.data.success) {
            setIncident(res.data.incident);
            // Si l'incident a déjà un devis, on redirige (sécurité)
            if (res.data.incident.quote) {
                toast.warning("Un devis existe déjà pour ce dossier.");
                router.push(`/dashboard/artisan/incidents/${incidentId}`);
            }
        }
      } catch (e) {
        toast.error("Impossible de charger le dossier.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
  }, [incidentId, router]);

  // 2. GESTION DES LIGNES
  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return toast.error("Le devis doit contenir au moins une ligne.");
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // 3. CALCULS TOTAUX
  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  // 4. SOUMISSION
  const handleSubmit = async () => {
    // Validation
    if (items.some(i => !i.description || i.unitPrice <= 0)) {
        return toast.error("Veuillez remplir correctement toutes les lignes.");
    }

    setSubmitting(true);
    try {
        await api.post('/artisan/quotes', {
            incidentId,
            items: items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
            notes,
            validityDays
        });
        
        toast.success("Devis envoyé au propriétaire !");
        router.push('/dashboard/artisan'); // Retour au dashboard
    } catch (e: any) {
        console.error(e);
        toast.error(e.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 lg:p-10 font-sans pb-32">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-8">
        <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-white mb-4 text-sm font-bold uppercase tracking-wider transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Annuler et retour
        </button>
        <h1 className="text-3xl font-black text-white uppercase flex items-center gap-3">
            <Calculator className="text-orange-500 w-8 h-8" /> Créer un devis
        </h1>
        {incident && (
            <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-white text-lg">{incident.title}</h3>
                    <p className="text-slate-400 text-sm">{incident.property?.address}, {incident.property?.commune}</p>
                </div>
                <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded text-xs font-black uppercase border border-orange-500/20">
                    Dossier #{incident.id.substring(0,8)}
                </div>
            </div>
        )}
      </div>

      {/* EDITEUR */}
      <div className="max-w-4xl mx-auto space-y-8">
          
          {/* LIGNES DU DEVIS */}
          <Card className="bg-[#0F172A] border-slate-800 border-t-4 border-t-orange-500 shadow-2xl">
              <CardHeader className="bg-slate-900/50 border-b border-slate-800 pb-4">
                  <CardTitle className="flex justify-between items-center text-white text-sm uppercase tracking-widest">
                      <span>Détail des prestations</span>
                      <Button onClick={addItem} variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white text-xs font-bold uppercase">
                          <Plus className="w-4 h-4 mr-1" /> Ajouter une ligne
                      </Button>
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                  {items.map((item, index) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-900/30 p-3 rounded-xl border border-slate-800/50 group hover:border-slate-700 transition">
                          <div className="flex-1 w-full">
                              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Description</label>
                              <Input 
                                placeholder="Ex: Remplacement joint syphon" 
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                className="bg-transparent border-slate-700 text-white focus:border-orange-500"
                              />
                          </div>
                          <div className="w-24">
                              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Qté</label>
                              <Input 
                                type="number" 
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="bg-transparent border-slate-700 text-white text-center focus:border-orange-500"
                              />
                          </div>
                          <div className="w-32">
                              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Prix Unitaire</label>
                              <Input 
                                type="number" 
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="bg-transparent border-slate-700 text-white text-right focus:border-orange-500 font-mono"
                              />
                          </div>
                          <div className="w-32 text-right hidden md:block">
                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Total Ligne</label>
                                <div className="h-10 flex items-center justify-end font-mono font-bold text-emerald-400">
                                    {(item.quantity * item.unitPrice).toLocaleString()} F
                                </div>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="p-2 text-slate-600 hover:text-red-500 mt-5 md:mt-0 transition">
                              <Trash2 className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </CardContent>
          </Card>

          {/* RÉCAP & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* GAUCHE: NOTES */}
              <div className="space-y-4">
                  <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
                          <FileText className="w-4 h-4" /> Notes pour le client (Optionnel)
                      </label>
                      <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Détails sur l'intervention, délais d'approvisionnement..."
                        className="bg-slate-900 border-slate-700 min-h-[120px] text-white"
                      />
                  </div>
                  
                  <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                          <Calendar className="w-4 h-4" /> Validité du devis
                      </label>
                      <select 
                        value={validityDays}
                        onChange={(e) => setValidityDays(parseInt(e.target.value))}
                        className="bg-slate-900 text-white border border-slate-700 rounded-lg p-2 text-sm font-bold focus:outline-none focus:border-orange-500"
                      >
                          <option value={7}>7 jours</option>
                          <option value={15}>15 jours</option>
                          <option value={30}>30 jours</option>
                      </select>
                  </div>
              </div>

              {/* DROITE: TOTAL */}
              <div className="bg-[#0F172A] p-8 rounded-2xl border border-slate-800 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                  
                  <div className="space-y-3 relative z-10">
                      <div className="flex justify-between text-slate-400 text-sm">
                          <span>Total HT</span>
                          <span>{calculateTotal().toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-sm">
                          <span>TVA (0%)</span>
                          <span>0 FCFA</span>
                      </div>
                      <div className="h-px bg-slate-700 my-4"></div>
                      <div className="flex justify-between items-end">
                          <span className="text-xl font-black text-white uppercase">Net à Payer</span>
                          <span className="text-4xl font-black text-emerald-400 tracking-tighter">
                              {calculateTotal().toLocaleString()} <span className="text-lg text-emerald-600 font-normal">FCFA</span>
                          </span>
                      </div>
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="w-full mt-8 bg-orange-600 hover:bg-orange-500 text-white font-black py-6 text-lg rounded-xl shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
                  >
                      {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <div className="flex items-center gap-2"><Save className="w-5 h-5"/> ENVOYER LE DEVIS</div>}
                  </Button>
              </div>
          </div>

      </div>
    </div>
  );
}
