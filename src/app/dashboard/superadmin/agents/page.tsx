"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  UserPlus, Mail, Phone, Lock, ShieldCheck, RefreshCw, Briefcase, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: {
    missionsAccepted: number;
    leads: number;
  };
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  // 1. Charger la liste (SÉCURISÉ)
  const fetchAgents = async () => {
    try {
      // ✅ APPEL SÉCURISÉ
      const res = await api.get('/superadmin/agents');
      
      if (res.data.success) {
        setAgents(res.data.agents);
      }
    } catch (error: any) {
      console.error("Erreur Agents:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error("Session expirée.");
          router.push('/login');
      } else {
          toast.error("Impossible de charger la liste des agents.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Créer un Agent
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // ✅ APPEL SÉCURISÉ
      const res = await api.post('/superadmin/agents', formData);
      
      if (res.data.success) {
        toast.success("Compte Agent créé avec succès !");
        
        // Mise à jour Optimiste
        const newAgentUI: Agent = {
            ...res.data.agent,
            _count: { missionsAccepted: 0, leads: 0 }
        };
        setAgents(prev => [newAgentUI, ...prev]);
        
        setFormData({ name: "", email: "", phone: "", password: "" }); // Reset
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  const generatePassword = () => {
    const pass = Math.random().toString(36).slice(-8) + "Immo!";
    setFormData(prev => ({ ...prev, password: pass }));
    navigator.clipboard.writeText(pass);
    toast.success("Mot de passe copié !");
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Recrutement en cours...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10 text-slate-200">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <Briefcase className="text-blue-500" /> Gestion des Agents
        </h1>
        <p className="text-slate-400 mt-1">Gérez votre force commerciale et suivez leurs performances.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : LISTE */}
        <div className="xl:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500"/> 
                    Équipe Actuelle <Badge className="bg-slate-800 text-slate-300 hover:bg-slate-700">{agents.length}</Badge>
                </h2>
            </div>
            
            {agents.length === 0 ? (
                <div className="bg-[#0B1120] border border-slate-800 border-dashed p-10 rounded-2xl text-center text-slate-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun agent recruté pour le moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {agents.map((agent) => (
                        <div key={agent.id} className="bg-[#0B1120] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center font-bold text-lg">
                                    {agent.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{agent.name}</p>
                                    <div className="flex flex-col md:flex-row gap-1 md:gap-3 text-sm text-slate-500 font-mono">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {agent.email}</span>
                                        <span className="hidden md:inline text-slate-700">|</span>
                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {agent.phone || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                                <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/5 text-center flex-1 md:flex-none">
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Missions</p>
                                    <p className="text-lg font-bold text-white">{agent._count?.missionsAccepted || 0}</p>
                                </div>
                                <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/5 text-center flex-1 md:flex-none">
                                    <p className="text-[10px] uppercase font-bold text-slate-500">Leads</p>
                                    <p className="text-lg font-bold text-[#F59E0B]">{agent._count?.leads || 0}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* COLONNE DROITE : FORMULAIRE */}
        <div>
            <Card className="bg-[#0B1120] border-white/5 shadow-2xl sticky top-8">
                <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <UserPlus className="w-5 h-5 text-blue-500" /> Nouveau Recrutement
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleCreate} className="space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Nom complet</Label>
                            <Input 
                                required 
                                className="bg-[#020617] border-white/10 text-white focus:border-blue-500"
                                placeholder="Ex: Marc Agent" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Email professionnel</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors"/>
                                <Input 
                                    required type="email" 
                                    className="pl-9 bg-[#020617] border-white/10 text-white focus:border-blue-500"
                                    placeholder="marc@immofacile.ci"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-slate-400 text-xs uppercase font-bold">Téléphone</Label>
                            <div className="relative group">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors"/>
                                <Input 
                                    className="pl-9 bg-[#020617] border-white/10 text-white focus:border-blue-500"
                                    placeholder="07 00 00 00 00"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-slate-400 text-xs uppercase font-bold">Mot de passe</Label>
                                <button type="button" onClick={generatePassword} className="text-[10px] flex items-center gap-1 text-blue-500 hover:text-blue-400 font-bold transition">
                                    <RefreshCw className="w-3 h-3"/> Générer
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors"/>
                                <Input 
                                    required 
                                    value={formData.password} 
                                    className="pl-9 bg-[#020617] border-white/10 text-white font-mono focus:border-blue-500"
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11">
                            {creating ? <Loader2 className="animate-spin w-5 h-5" /> : "Créer le compte Agent"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
