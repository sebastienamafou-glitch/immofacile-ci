"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Building2, Users, Wallet, Plus, Search, 
  MoreVertical, Ban, CheckCircle, ShieldAlert, Loader2, Home
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Swal from "sweetalert2";
import { toast } from "sonner";

interface Agency {
  id: string;
  name: string;
  code: string;
  walletBalance: number;
  isActive: boolean;
  stats: {
    listings: number;
    properties: number;
    staff: number;
  };
  admin: {
    name: string;
    email: string;
    phone: string | null;
  };
  createdAt: string;
}

export default function AgenciesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. CHARGEMENT DONNÉES ---
  const fetchAgencies = async () => {
    try {
      setLoading(true);
      // ✅ APPEL API SÉCURISÉ (GET /superadmin/agencies)
      const res = await api.get('/superadmin/agencies');
      if (res.data.success) {
        setAgencies(res.data.agencies);
      }
    } catch (error) {
      console.error("Load Agencies Error", error);
      toast.error("Impossible de charger les agences.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  // --- 2. CRÉATION AGENCE (Formulaire SweetAlert) ---
  const handleCreate = () => {
    Swal.fire({
      title: 'Nouvelle Agence SaaS',
      html: `
        <div class="space-y-4 text-left text-sm mt-2">
           <div>
             <label class="block text-slate-400 mb-1 font-bold text-xs uppercase">Nom de l'Agence</label>
             <input id="swal-name" class="swal2-input !m-0 !w-full !bg-slate-900 !border-slate-700 !text-white" placeholder="Ex: Immo Prestige">
           </div>
           <div>
             <label class="block text-slate-400 mb-1 font-bold text-xs uppercase">Slug (URL)</label>
             <input id="swal-slug" class="swal2-input !m-0 !w-full !bg-slate-900 !border-slate-700 !text-white" placeholder="Ex: immo-prestige">
           </div>
           <hr class="border-slate-700 my-4"/>
           <div>
             <label class="block text-slate-400 mb-1 font-bold text-xs uppercase">Nom de l'Admin</label>
             <input id="swal-admin-name" class="swal2-input !m-0 !w-full !bg-slate-900 !border-slate-700 !text-white" placeholder="Nom complet">
           </div>
           <div>
             <label class="block text-slate-400 mb-1 font-bold text-xs uppercase">Email Admin</label>
             <input id="swal-admin-email" class="swal2-input !m-0 !w-full !bg-slate-900 !border-slate-700 !text-white" placeholder="admin@agence.com">
           </div>
           <div>
             <label class="block text-slate-400 mb-1 font-bold text-xs uppercase">Téléphone</label>
             <input id="swal-admin-phone" class="swal2-input !m-0 !w-full !bg-slate-900 !border-slate-700 !text-white" placeholder="07xxxxxxxx">
           </div>
        </div>
      `,
      focusConfirm: false,
      background: '#0B1120', 
      color: '#fff',
      showCancelButton: true,
      confirmButtonColor: '#F59E0B',
      confirmButtonText: 'Créer le Partenaire',
      cancelButtonText: 'Annuler',
      width: '500px',
      preConfirm: () => {
        return {
          agencyName: (document.getElementById('swal-name') as HTMLInputElement).value,
          agencySlug: (document.getElementById('swal-slug') as HTMLInputElement).value,
          adminName: (document.getElementById('swal-admin-name') as HTMLInputElement).value,
          adminEmail: (document.getElementById('swal-admin-email') as HTMLInputElement).value,
          adminPhone: (document.getElementById('swal-admin-phone') as HTMLInputElement).value,
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const { agencyName, agencySlug, adminEmail } = result.value;
        if(!agencyName || !agencySlug || !adminEmail) {
            return toast.error("Tous les champs sont requis.");
        }

        const toastId = toast.loading("Création de l'environnement SaaS...");
        
        try {
            // ✅ APPEL API SÉCURISÉ (POST /superadmin/agencies/create)
            const res = await api.post('/superadmin/agencies/create', result.value);
            
            if (res.data.success) {
                toast.dismiss(toastId);
                
                // Affichage des identifiants générés
                await Swal.fire({
                    icon: 'success',
                    title: 'Agence Activée !',
                    html: `
                        <div class="text-left bg-slate-900 p-4 rounded-lg border border-slate-700">
                            <p class="text-slate-400 text-sm mb-2">Transmettez ces accès à l'administrateur :</p>
                            <p class="font-mono text-white">Email: <span class="text-orange-500">${res.data.credentials.email}</span></p>
                            <p class="font-mono text-white">Pass: <span class="text-orange-500">${res.data.credentials.tempPassword}</span></p>
                        </div>
                    `,
                    background: '#0B1120', color: '#fff', confirmButtonColor: '#10b981'
                });

                fetchAgencies(); // Refresh liste
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.response?.data?.error || "Erreur création agence.");
        }
      }
    });
  };

  // --- 3. FILTRAGE ---
  const filteredAgencies = agencies.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
        <p className="text-sm font-mono text-slate-500">Chargement du réseau...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Building2 className="text-orange-500 w-8 h-8" /> PARTENAIRES SAAS
            </h1>
            <p className="text-slate-400 text-sm mt-1">Gérez les agences immobilières connectées à la plateforme.</p>
        </div>
        <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-orange-900/20">
            <Plus className="w-5 h-5 mr-2" /> Nouvelle Agence
        </Button>
      </div>

      {/* LISTE */}
      <Card className="bg-[#0B1120] border-white/5 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="pb-4 border-b border-white/5 pt-6 px-6">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Rechercher une agence..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-2.5 pl-10 text-sm focus:border-orange-500 outline-none transition text-white placeholder:text-slate-600"
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] text-slate-500 uppercase bg-white/[0.02] font-bold tracking-widest border-b border-white/5">
                        <tr>
                            <th className="p-4 pl-6">Agence</th>
                            <th className="p-4">Admin Responsable</th>
                            <th className="p-4">Métriques</th>
                            <th className="p-4">Trésorerie</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredAgencies.map((agency) => (
                            <tr key={agency.id} className="hover:bg-white/[0.02] transition group">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-white text-base">{agency.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 bg-white/5 w-fit px-1.5 py-0.5 rounded border border-white/5">
                                        {agency.code}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {agency.admin.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">{agency.admin.name}</div>
                                            <div className="text-xs text-slate-500">{agency.admin.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5 gap-1 font-normal">
                                            <Home className="w-3 h-3 text-blue-500" /> {agency.stats.properties + agency.stats.listings}
                                        </Badge>
                                        <Badge variant="outline" className="border-white/10 text-slate-400 bg-white/5 gap-1 font-normal">
                                            <Users className="w-3 h-3 text-purple-500" /> {agency.stats.staff}
                                        </Badge>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-mono font-bold text-emerald-400 flex items-center gap-2">
                                        {agency.walletBalance.toLocaleString()} F
                                    </div>
                                </td>
                                <td className="p-4">
                                    {agency.isActive ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">ACTIF</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">SUSPENDU</Badge>
                                    )}
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/10">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {filteredAgencies.length === 0 && (
                             <tr><td colSpan={6} className="p-12 text-center text-slate-500 italic">Aucune agence trouvée.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
