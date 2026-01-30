"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api"; // ✅ Wrapper sécurisé
import { toast } from "sonner";
import { 
  Users, Plus, Search, Phone, Wallet, FileText, 
  Loader2, MoreHorizontal, Save 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Lead {
  id: string;
  name: string;
  phone: string;
  budget: number | null;
  status: string;
  needs: string | null;
  createdAt: string;
}

export default function AgentLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal Création
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", budget: "", needs: "" });

  // Modal Édition
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // 1. CHARGEMENT
  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/agent/leads');
      if (res.data.success) {
        setLeads(res.data.leads);
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger vos prospects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // 2. CRÉATION
  const handleCreate = async () => {
    if (!newLead.name || !newLead.phone) {
        toast.error("Nom et Téléphone obligatoires.");
        return;
    }
    try {
        const res = await api.post('/agent/leads', newLead);
        if (res.data.success) {
            toast.success("Prospect ajouté !");
            setIsCreateOpen(false);
            setNewLead({ name: "", phone: "", budget: "", needs: "" });
            fetchLeads();
        }
    } catch (e: any) {
        toast.error("Erreur lors de la création.");
    }
  };

  // 3. MISE À JOUR
  const handleUpdate = async () => {
    if (!editingLead) return;
    try {
        await api.put('/agent/leads', {
            id: editingLead.id,
            status: editingLead.status,
            needs: editingLead.needs
        });
        toast.success("Dossier mis à jour !");
        setEditingLead(null);
        fetchLeads();
    } catch (e) {
        toast.error("Erreur sauvegarde.");
    }
  };

  // Filtrage
  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm)
  );

  if (loading) return <div className="h-[80vh] flex items-center justify-center bg-[#0B1120]"><Loader2 className="animate-spin w-10 h-10 text-orange-500"/></div>;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-[#0B1120] text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-500" /> Mes Prospects
            </h1>
            <p className="text-slate-400 mt-1">Gérez votre carnet d'adresses client personnel.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-2">
                    <Plus size={18} /> Nouveau Prospect
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950 border-slate-800 text-white">
                <DialogHeader><DialogTitle>Ajouter un client</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Nom Complet *" className="bg-slate-900 border-slate-800" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                        <Input placeholder="Téléphone *" className="bg-slate-900 border-slate-800" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input type="number" placeholder="Budget (FCFA)" className="bg-slate-900 border-slate-800" value={newLead.budget} onChange={e => setNewLead({...newLead, budget: e.target.value})} />
                    </div>
                    <Textarea placeholder="Besoin spécifique (ex: 3 pièces zone 4...)" className="bg-slate-900 border-slate-800" value={newLead.needs} onChange={e => setNewLead({...newLead, needs: e.target.value})} />
                    <Button onClick={handleCreate} className="w-full bg-orange-600 font-bold">Enregistrer</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      {/* RECHERCHE */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        <Input 
            placeholder="Rechercher par nom ou téléphone..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white h-12 rounded-xl focus:border-orange-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-orange-500/30 transition group shadow-lg">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 border border-slate-700">
                            {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white leading-tight">{lead.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <Phone size={10} /> {lead.phone}
                            </p>
                        </div>
                    </div>
                    <Badge className={`
                        ${lead.status === 'NEW' ? 'bg-blue-500/10 text-blue-400' : ''}
                        ${lead.status === 'CONTACTED' ? 'bg-orange-500/10 text-orange-400' : ''}
                        ${lead.status === 'CONVERTED' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                        ${lead.status === 'LOST' ? 'bg-red-500/10 text-red-400' : ''}
                        border-0
                    `}>
                        {lead.status}
                    </Badge>
                </div>

                <div className="space-y-2 mb-4">
                    {lead.budget && (
                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-950 p-2 rounded-lg">
                            <Wallet size={14} className="text-emerald-500" />
                            <span className="font-mono">{lead.budget.toLocaleString()} F</span>
                        </div>
                    )}
                    {lead.needs && (
                        <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-950 p-2 rounded-lg min-h-[50px]">
                            <FileText size={14} className="text-slate-600 mt-0.5" />
                            <span className="line-clamp-2">{lead.needs}</span>
                        </div>
                    )}
                </div>

                <Dialog open={editingLead?.id === lead.id} onOpenChange={(open) => !open && setEditingLead(null)}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white" onClick={() => setEditingLead(lead)}>
                            <MoreHorizontal className="w-4 h-4 mr-2" /> Gérer / Modifier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-950 border-slate-800 text-white">
                        <DialogHeader><DialogTitle>Modifier {lead.name}</DialogTitle></DialogHeader>
                        {editingLead && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Statut</label>
                                    <Select 
                                        value={editingLead.status} 
                                        onValueChange={(v) => setEditingLead({...editingLead, status: v})}
                                    >
                                        <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                            <SelectItem value="NEW">Nouveau</SelectItem>
                                            <SelectItem value="CONTACTED">Contacté</SelectItem>
                                            <SelectItem value="VISIT_SCHEDULED">Visite Prévue</SelectItem>
                                            <SelectItem value="CONVERTED">Converti (Signé)</SelectItem>
                                            <SelectItem value="LOST">Perdu</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-500">Notes / Besoins</label>
                                    <Textarea 
                                        className="bg-slate-900 border-slate-800 min-h-[100px]" 
                                        value={editingLead.needs || ""} 
                                        onChange={e => setEditingLead({...editingLead, needs: e.target.value})}
                                    />
                                </div>
                                <Button onClick={handleUpdate} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold">
                                    <Save size={16} className="mr-2" /> Enregistrer les modifications
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        ))}
      </div>
    </div>
  );
}
