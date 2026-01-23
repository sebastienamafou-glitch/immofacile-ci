"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { api } from "@/lib/api";
import Link from "next/link";
import Swal from "sweetalert2";
import { 
  ArrowLeft, Plus, Trash2, Phone, Briefcase, 
  Search, ShieldCheck, User, Wrench, Loader2 
} from "lucide-react";

// ✅ 1. TYPAGE STRICT (Fini les 'any')
interface Artisan {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  _count?: {
    incidentsAssigned: number;
  };
}

export default function AdminArtisansPage() {
  const router = useRouter();
  const [artisans, setArtisans] = useState<Artisan[]>([]); // Typage appliqué
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ FONCTION AUTH
  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'SUPER_ADMIN' ? user : null;
  };

  const fetchArtisans = async () => {
    const admin = getAdminUser();
    if (!admin) { router.push('/login'); return; }

    try {
        const res = await api.get('/admin/artisans', {
            headers: { 'x-user-email': admin.email }
        });
        if (res.data.success) {
            // Sécurisation des données reçues
            const cleanData = res.data.artisans.map((a: any) => ({
                ...a,
                _count: a._count || { incidentsAssigned: 0 }
            }));
            setArtisans(cleanData);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchArtisans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateArtisan = async () => {
    const admin = getAdminUser();
    if (!admin) return;

    const { value: formValues } = await Swal.fire({
        title: 'Nouvel Artisan 🛠️',
        html: `
            <input id="swal-name" class="swal2-input" placeholder="Nom complet" style="background:#1e293b; color:white; border:1px solid #334155;">
            <input id="swal-phone" class="swal2-input" placeholder="Téléphone (Identifiant)" style="background:#1e293b; color:white; border:1px solid #334155;">
            <select id="swal-job" class="swal2-input" style="background:#1e293b; color:white; border:1px solid #334155;">
                <option value="Plombier">Plombier</option>
                <option value="Électricien">Électricien</option>
                <option value="Peintre">Peintre</option>
                <option value="Climatisation">Froid & Climatisation</option>
                <option value="Serrurier">Serrurier</option>
                <option value="Menuisier">Menuisier</option>
                <option value="Maçon">Maçon</option>
            </select>
        `,
        focusConfirm: false,
        background: '#0f172a',
        color: '#fff',
        confirmButtonText: 'Créer le compte',
        confirmButtonColor: '#2563EB', // Bleu Pro pour les artisans
        showCancelButton: true,
        preConfirm: () => {
            return {
                name: (document.getElementById('swal-name') as HTMLInputElement).value,
                phone: (document.getElementById('swal-phone') as HTMLInputElement).value,
                job: (document.getElementById('swal-job') as HTMLInputElement).value,
            }
        }
    });

    if (formValues) {
        if(!formValues.name || !formValues.phone) return Swal.fire('Erreur', 'Nom et Téléphone requis', 'error');

        try {
            const res = await api.post('/admin/artisans', formValues, {
                headers: { 'x-user-email': admin.email }
            });

            if (res.data.success) {
                const creds = res.data.credentials;
                await Swal.fire({
                    title: 'Compte Créé ! ✅',
                    html: `
                        <div class="text-left bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <p class="text-sm text-slate-400 mb-2">Transmettez ces infos à l'artisan :</p>
                            <p>👤 <strong>${creds.name}</strong></p>
                            <p>📱 Login : <strong class="text-blue-400">${creds.phone}</strong></p>
                            <p>🔑 Passe : <strong class="text-orange-400 text-xl font-mono select-all">${creds.password}</strong></p>
                        </div>
                        <p class="text-xs text-red-400 mt-2">Notez le mot de passe, il ne sera plus affiché.</p>
                    `,
                    background: '#0f172a', color: '#fff',
                    confirmButtonText: 'C\'est noté',
                    icon: 'success'
                });
                fetchArtisans(); 
            }
        } catch (error: any) {
            Swal.fire({ title: 'Erreur', text: error.response?.data?.error || "Impossible de créer ce compte.", icon: 'error', background: '#0f172a', color: '#fff' });
        }
    }
  };

  const filtered = artisans.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.phone.includes(searchTerm));

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Recrutement des pros...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-10 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/dashboard/superadmin" className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Wrench className="text-blue-500" /> Gestion Artisans
                </h1>
                <p className="text-slate-400 text-sm">Gérez les prestataires agréés ImmoFacile.</p>
            </div>
        </div>
        <button 
            onClick={handleCreateArtisan}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-[0_0_20px_rgba(37,99,235,0.3)]"
        >
            <Plus className="w-5 h-5" /> ENRÔLER UN ARTISAN
        </button>
      </div>

      <div className="relative max-w-md mb-8">
         <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
         <input 
            type="text" placeholder="Rechercher par nom ou téléphone..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-sm focus:border-blue-500 outline-none transition text-white"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((artisan) => (
            <div key={artisan.id} className="bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition"><Briefcase className="w-24 h-24 text-white"/></div>
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border border-white/10">
                        {artisan.name.charAt(0)}
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> AGRÉÉ
                    </span>
                </div>

                <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white truncate">{artisan.name}</h3>
                    <p className="text-slate-500 text-xs font-medium mb-4">{artisan.email || "Email non renseigné"}</p>

                    <div className="space-y-2 text-sm text-slate-400 bg-black/20 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-500" /> {artisan.phone}
                        </div>
                        <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-orange-500" /> {artisan._count?.incidentsAssigned || 0} missions
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2 relative z-10">
                    <button className="text-slate-500 hover:text-red-500 transition p-2 hover:bg-red-500/10 rounded-lg" title="Révoquer l'accès">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        ))}

        {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Aucun artisan trouvé.</p>
            </div>
        )}
      </div>

    </div>
  );
}
