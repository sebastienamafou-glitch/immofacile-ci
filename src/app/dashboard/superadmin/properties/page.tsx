"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { 
  Building, MapPin, Search, Trash2, ExternalLink, Loader2, Home, Briefcase, User, EyeOff, ArrowLeft, Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AdminProperty {
  id: string;
  title: string;
  price: number;
  commune: string;
  type: string;
  isPublished: boolean;
  images: string[];
  manager: {
    name: string;
    type: "AGENCY" | "OWNER";
    sub: string;
  };
  status: "OCCUPIED" | "AVAILABLE";
  createdAt: string;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

export default function AdminPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<AdminProperty[]>([]);
  
  // États de filtrage
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const fetchProperties = async () => {
    try {
        setLoading(true);
        const res = await api.get('/superadmin/properties');
        if (res.data.success) {
            setProperties(res.data.properties);
        }
    } catch (error: unknown) {
        console.error("Erreur Properties", error);
        const apiErr = error as ApiError;
        
        if (apiErr.response?.status === 401 || apiErr.response?.status === 403) {
            router.push('/login');
        } else {
            toast.error("Erreur chargement parc immobilier.");
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
        title: 'Supprimer ce bien ?',
        text: "Cette action est irréversible. Si le bien a un historique, la suppression sera bloquée.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Oui, supprimer',
        background: '#0f172a', color: '#fff'
    });

    if (result.isConfirmed) {
        const toastId = toast.loading("Vérification et suppression...");
        try {
            await api.delete(`/superadmin/properties?id=${id}`);
            
            setProperties(prev => prev.filter(p => p.id !== id));
            toast.success("Bien supprimé avec succès.", { id: toastId });
            
        } catch (error: unknown) {
            const apiErr = error as ApiError;
            const errorMsg = apiErr.response?.data?.error || "Erreur lors de la suppression.";
            toast.error(errorMsg, { id: toastId, duration: 5000 });
        }
    }
  };

  // Moteur de recherche et filtres combinés
  const filteredProps = properties.filter(p => {
    const matchesSearch = 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.commune.toLowerCase().includes(searchTerm.toLowerCase());
        
    const matchesType = filterType === "ALL" || p.type === filterType;
    
    let matchesStatus = true;
    if (filterStatus === "PUBLISHED") matchesStatus = p.isPublished;
    if (filterStatus === "HIDDEN") matchesStatus = !p.isPublished;
    if (filterStatus === "OCCUPIED") matchesStatus = p.status === "OCCUPIED";
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Extraction dynamique des types de biens disponibles
  const availableTypes = Array.from(new Set(properties.map(p => p.type)));

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500"/>
        <p className="text-sm font-mono text-slate-500">Scan du Parc Immobilier...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10 text-slate-200 font-sans pb-20">
      
      {/* BOUTON RETOUR */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition font-medium text-sm w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
        <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                <Building className="text-orange-500" /> PARC IMMOBILIER
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
                Supervision des {properties.length} actifs • <span className="text-white font-bold">{filteredProps.length} affichés</span>
            </p>
        </div>
        
        {/* BARRE D'OUTILS : Recherche & Filtres */}
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition" />
                <input 
                    type="text" 
                    placeholder="Recherche globale..." 
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-all placeholder:text-slate-600"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="relative w-full sm:w-48 group">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition pointer-events-none" />
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full appearance-none bg-[#0B1120] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-all cursor-pointer"
                >
                    <option value="ALL">Tous les types</option>
                    {availableTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            <div className="relative w-full sm:w-48 group">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition pointer-events-none" />
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none bg-[#0B1120] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 outline-none text-white transition-all cursor-pointer"
                >
                    <option value="ALL">Tous les statuts</option>
                    <option value="PUBLISHED">Publié en ligne</option>
                    <option value="HIDDEN">Masqué</option>
                    <option value="OCCUPIED">Actuellement Loué</option>
                </select>
            </div>
        </div>
      </div>

      {/* LISTE */}
      <div className="bg-[#0B1120] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-white/[0.02] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                        <th className="px-6 py-4">Bien</th>
                        <th className="px-6 py-4">Localisation</th>
                        <th className="px-6 py-4">Valeur Locative</th>
                        <th className="px-6 py-4">Gestionnaire</th>
                        <th className="px-6 py-4 text-center">État</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredProps.map((property) => (
                        <tr key={property.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                        {property.images.length > 0 ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={property.images[0]} alt="Bien" className="w-full h-full object-cover" />
                                        ) : (
                                            <Home className="text-slate-600 w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white truncate max-w-[180px]" title={property.title}>{property.title}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{property.type}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-300">
                                <div className="flex items-center gap-1.5 text-xs">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> 
                                    <span className="truncate max-w-[120px]" title={property.commune}>{property.commune}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-[#F59E0B] whitespace-nowrap">
                                {property.price.toLocaleString()} F
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    {property.manager.type === 'AGENCY' ? (
                                        <Briefcase className="w-3 h-3 text-purple-400 shrink-0" />
                                    ) : (
                                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                                    )}
                                    <div>
                                        <p className="text-white font-medium text-xs truncate max-w-[120px]" title={property.manager.name}>{property.manager.name}</p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-[120px]" title={property.manager.sub}>{property.manager.sub}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center space-y-1">
                                <div>
                                    {property.isPublished ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] hover:bg-emerald-500/20">Publié</Badge>
                                    ) : (
                                        <Badge className="bg-slate-700/50 text-slate-400 border-slate-600/50 text-[9px] gap-1 hover:bg-slate-700/70"><EyeOff size={8}/> Masqué</Badge>
                                    )}
                                </div>
                                {property.status === 'OCCUPIED' && (
                                    <span className="text-[9px] font-bold text-blue-400 block">Loué (Actif)</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link href={`/properties/${property.id}`} target="_blank">
                                        <button 
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 rounded-lg transition" 
                                            title="Voir l'annonce publique"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </Link>
                                    <button 
                                        onClick={() => handleDelete(property.id)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition" 
                                        title="Supprimer définitivement"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredProps.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-16 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Search className="w-8 h-8 text-slate-600" />
                                    <p className="text-slate-400 text-sm">Aucun bien ne correspond à vos critères.</p>
                                    <button onClick={() => {setSearchTerm(""); setFilterType("ALL"); setFilterStatus("ALL");}} className="text-orange-500 text-xs font-bold hover:underline">
                                        Réinitialiser les filtres
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
