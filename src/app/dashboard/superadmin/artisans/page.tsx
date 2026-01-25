"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner"; // ✅ On ajoute Sonner pour les notifications légères
import { 
  ArrowLeft, Plus, Trash2, Phone, Briefcase, 
  Search, ShieldCheck, User, Wrench, Loader2, Mail 
} from "lucide-react";
import Link from "next/link";

// ✅ TYPAGE STRICT
interface Artisan {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  _count: {
    incidentsAssigned: number;
  };
}

export default function AdminArtisansPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. CHARGEMENT SÉCURISÉ ---
  const fetchArtisans = async () => {
    try {
        // 🔒 Pas de header manuel, le cookie s'en charge
        const res = await api.get('/superadmin/artisans');
        
        if (res.data.success) {
            setArtisans(res.data.artisans);
        }
    } catch (error: any) {
        console.error("Erreur Artisans:", error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error("Session expirée.");
            router.push('/login');
        } else {
            toast.error("Impossible de charger l'annuaire des artisans.");
        }
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => {
    fetchArtisans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 2. CRÉATION (Formulaire Swal) ---
  const handleCreateArtisan = async () => {
    
    const { value: formValues } = await Swal.fire({
        title: 'Enrôler un Prestataire 🛠️',
        html: `
            <div class="space-y-3 text-left">
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase">Nom Complet</label>
                    <input id="swal-name" class="w-full bg-[#1e293b] text-white border border-slate-600 rounded p-2 focus:border-blue-500 outline-none" placeholder="Ex: Jean Kouassi">
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase">Téléphone (Login)</label>
                    <input id="swal-phone" class="w-full bg-[#1e293b] text-white border border-slate-600 rounded p-2 focus:border-blue-500 outline-none" placeholder="07 00 00 00 00">
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-400 uppercase">Spécialité</label>
                    <select id="swal-job" class="w-full bg-[#1e293b] text-white border border-slate-600 rounded p-2 focus:border-blue-500 outline-none">
                        <option value="Plombier">Plombier</option>
                        <option value="Électricien">Électricien</option>
                        <option value="Peintre">Peintre</option>
                        <option value="Froid & Climatisation">Froid & Climatisation</option>
                        <option value="Serrurier">Serrurier</option>
                        <option value="Menuisier">Menuisier</option>
                        <option value="Maçon">Maçon</option>
                        <option value="Jardinier">Jardinier</option>
                    </select>
                </div>
            </div>
        `,
        focusConfirm: false,
        background: '#0f172a',
        color: '#fff',
        confirmButtonText: 'Créer le compte',
        confirmButtonColor: '#2563EB',
        showCancelButton: true,
        cancelButtonText: 'Annuler',
        cancelButtonColor: '#1e293b',
        preConfirm: () => {
            return {
                name: (document.getElementById('swal-name') as HTMLInputElement).value,
                phone: (document.getElementById('swal-phone') as HTMLInputElement).value,
                job: (document.getElementById('swal-job') as HTMLInputElement).value,
            }
        }
    });

    if (formValues) {
        if(!formValues.name || !formValues.phone) {
            toast.error("Le nom et le téléphone sont obligatoires.");
            return;
        }

        // Feedback visuel pendant la création
        const loadingToast = toast.loading("Création du compte...");

        try {
            // 🔒 Appel sécurisé
            const res = await api.post('/superadmin/artisans', formValues);

            if (res.data.success) {
                toast.dismiss(loadingToast); // On ferme le chargement
                
                const creds = res.data.credentials;
                
                // Affichage des identifiants générés
                await Swal.fire({
                    title: 'Compte Créé avec Succès ! ✅',
                    html: `
                        <div class="text-left bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-xl">
                            <p class="text-sm text-slate-400 mb-4 border-b border-slate-700 pb-2">Veuillez transmettre ces accès à l'artisan :</p>
                            
                            <div class="space-y-2 font-mono text-sm">
                                <p class="flex justify-between">
                                    <span class="text-slate-500">Nom :</span> 
                                    <span class="text-white font-bold">${creds.name}</span>
                                </p>
                                <p class="flex justify-between">
                                    <span class="text-slate-500">Identifiant :</span> 
                                    <span class="text-blue-400 font-bold">${creds.phone}</span>
                                </p>
                                <p class="flex justify-between bg-black/30 p-2 rounded">
                                    <span class="text-slate-500">Mot de passe :</span> 
                                    <span class="text-[#F59E0B] font-black text-lg select-all">${creds.password}</span>
                                </p>
                            </div>
                        </div>
                        <p class="text-[10px] text-red-400 mt-4 flex items-center justify-center gap-1">
                            <ShieldCheck class="w-3 h-3"/> Copiez le mot de passe, il ne sera plus affiché.
                        </p>
                    `,
                    background: '#0f172a', color: '#fff',
                    confirmButtonText: 'C\'est noté, fermer',
                    confirmButtonColor: '#10b981',
                    icon: 'success'
                });
                
                fetchArtisans(); // Rafraîchir la liste
            }
        } catch (error: any) {
            toast.dismiss(loadingToast);
            const msg = error.response?.data?.error || "Impossible de créer ce compte.";
            toast.error(msg);
        }
    }
  };

  // Filtrage
  const filtered = artisans.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.phone.includes(searchTerm) ||
    a.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Chargement des prestataires...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Wrench className="text-blue-500 w-8 h-8" /> ARTISANS & PRESTATAIRES
            </h1>
            <p className="text-slate-400 text-sm mt-1">Gestion des professionnels agréés pour la maintenance.</p>
        </div>
        
        <button 
            onClick={handleCreateArtisan}
            className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95"
        >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> ENRÔLER UN PRO
        </button>
      </div>

      {/* RECHERCHE */}
      <div className="relative max-w-md mb-8 group">
         <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
         <input 
            type="text" placeholder="Rechercher (Nom, Téléphone, Spécialité)..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B1120] border border-white/10 rounded-xl py-3 pl-10 text-sm focus:border-blue-500 outline-none transition-all text-white placeholder:text-slate-600"
         />
      </div>

      {/* GRID DES ARTISANS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((artisan) => (
            <div key={artisan.id} className="bg-[#0B1120] border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all group relative overflow-hidden shadow-lg hover:shadow-blue-900/10">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition duration-500 transform group-hover:scale-110">
                    <Briefcase className="w-24 h-24 text-white"/>
                </div>
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-lg shadow-inner">
                        {artisan.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-bold px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> AGRÉÉ
                    </span>
                </div>

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white truncate tracking-tight">{artisan.name}</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-4 text-blue-400">
                        {artisan.jobTitle || "Technicien"}
                    </p>

                    <div className="space-y-2 text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-500" /> 
                            <span className="font-mono text-xs">{artisan.phone}</span>
                        </div>
                        {artisan.email && !artisan.email.startsWith('artisan-') && (
                             <div className="flex items-center gap-2 text-slate-300 truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" /> 
                                <span className="font-mono text-[10px] truncate" title={artisan.email}>{artisan.email}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-300 pt-1 mt-1 border-t border-white/5">
                            <Wrench className="w-3.5 h-3.5 text-[#F59E0B]" /> 
                            <span className="text-xs font-bold">{artisan._count?.incidentsAssigned || 0} missions réalisées</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end gap-2 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => toast.info("Historique des interventions bientôt disponible")}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition"
                    >
                        Voir détails
                    </button>
                </div>
            </div>
        ))}

        {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] flex flex-col items-center">
                <User className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                <p className="text-white font-bold text-lg">Aucun artisan trouvé.</p>
                <p className="text-slate-500 text-sm">Commencez par enrôler un professionnel.</p>
            </div>
        )}
      </div>

    </div>
  );
}
