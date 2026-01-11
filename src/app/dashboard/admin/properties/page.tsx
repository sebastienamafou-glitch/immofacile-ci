"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { 
  Building, MapPin, Search, Trash2, ExternalLink, Loader2, Home 
} from "lucide-react";

// Types pour le Frontend
interface Property {
  id: string;
  title: string;
  price: number;
  commune: string;
  type: string;
  isPublished: boolean;
  images: string[];
  owner: {
    name: string | null;
    email: string;
    phone: string;
  };
}

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'ADMIN' ? user : null;
  };

  const fetchProperties = async () => {
    const admin = getAdminUser();
    if (!admin) { router.push('/login'); return; }

    try {
        const res = await api.get('/admin/properties', {
            headers: { 'x-user-email': admin.email }
        });
        if (res.data.success) {
            setProperties(res.data.properties);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    const admin = getAdminUser();
    if (!admin) return;

    const result = await Swal.fire({
        title: 'Supprimer ce bien ?',
        text: "Cette action est irréversible.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, supprimer',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await api.delete(`/admin/properties?id=${id}`, {
                headers: { 'x-user-email': admin.email }
            });
            setProperties(prev => prev.filter(p => p.id !== id));
            Swal.fire({ title: 'Supprimé!', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#fff' });
        } catch (e) {
            Swal.fire({ title: 'Erreur', text: "Impossible de supprimer (le bien est peut-être loué).", icon: 'error', background: '#0f172a', color: '#fff' });
        }
    }
  };

  // Filtrage
  const filteredProps = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.commune.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
        <p className="text-sm font-mono text-slate-500">Chargement du Parc Immobilier...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 md:p-10 text-slate-200">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Building className="text-orange-500" /> Parc Immobilier
            </h1>
            <p className="text-slate-400 mt-1">Gestion globale des {properties.length} biens sur la plateforme.</p>
        </div>
        
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input 
                type="text" 
                placeholder="Rechercher (Titre, Propriétaire, Ville)..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* LISTE DES BIENS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-xs">
                    <tr>
                        <th className="px-6 py-4">Bien</th>
                        <th className="px-6 py-4">Localisation</th>
                        <th className="px-6 py-4">Prix / Mois</th>
                        <th className="px-6 py-4">Propriétaire</th>
                        <th className="px-6 py-4 text-center">Statut</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredProps.map((property) => (
                        <tr key={property.id} className="hover:bg-slate-800/50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
                                        {property.images.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={property.images[0]} alt="Bien" className="w-full h-full object-cover" />
                                        ) : (
                                            <Home className="text-slate-600 w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white truncate max-w-[200px]">{property.title}</p>
                                        <p className="text-xs text-slate-500">{property.type}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {property.commune}
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-orange-400">
                                {property.price.toLocaleString()} F
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-white font-medium">{property.owner.name || "Inconnu"}</p>
                                <p className="text-xs text-slate-500">{property.owner.email}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${property.isPublished ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {property.isPublished ? "Publié" : "Masqué"}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition" title="Voir détails">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(property.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition" 
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {filteredProps.length === 0 && (
            <div className="p-12 text-center text-slate-500">
                <Building className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun bien trouvé correspondant à votre recherche.</p>
            </div>
        )}
      </div>
    </div>
  );
}
