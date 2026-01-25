"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Filter, Shield, Ban, CheckCircle, User, Briefcase, Key, Loader2, Landmark } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner"; // Utilisation de Sonner pour cohérence avec le reste

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const fetchUsers = async () => {
    try {
        // ✅ CORRECTION DE L'URL (superadmin)
        const res = await api.get('/superadmin/users');
        if (res.data.success) {
            setUsers(res.data.users);
        }
    } catch (error) {
        console.error("Erreur chargement users", error);
        toast.error("Impossible de charger la liste des utilisateurs");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ VRAIE ACTION API (Plus de simulation)
  const toggleStatus = async (user: any) => {
    const newStatus = !user.isActive; // On inverse l'état actuel
    const actionLabel = newStatus ? 'Réactiver' : 'Bloquer';
    const color = newStatus ? '#10b981' : '#ef4444';

    const confirm = await Swal.fire({
        title: `${actionLabel} l'accès ?`,
        text: `Utilisateur : ${user.name}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: color,
        confirmButtonText: `Oui, ${actionLabel}`,
        background: '#1e293b', color: '#fff'
    });

    if (confirm.isConfirmed) {
        try {
            // Appel API PATCH
            const res = await api.patch('/superadmin/users', {
                userId: user.id,
                isActive: newStatus
            });

            if (res.data.success) {
                // Mise à jour locale pour rapidité
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
                toast.success(`Compte ${newStatus ? 'réactivé' : 'bloqué'} avec succès.`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erreur lors de la mise à jour");
        }
    }
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (u.name || "").toLowerCase().includes(term) || 
                          (u.phone || "").includes(term) || 
                          (u.email || "").toLowerCase().includes(term);
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch(role) {
        case 'SUPER_ADMIN': return <Shield className="w-4 h-4 text-purple-500" />;
        case 'OWNER': return <Key className="w-4 h-4 text-orange-500" />;
        case 'AGENT': return <Briefcase className="w-4 h-4 text-blue-500" />;
        case 'INVESTOR': return <Landmark className="w-4 h-4 text-emerald-500" />;
        default: return <User className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0B1120] text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500"/>
        <p className="text-sm font-mono text-slate-500">Chargement de l'annuaire...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-8 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tight">UTILISATEURS</h1>
            <p className="text-slate-400 text-sm mt-1">Gestion centralisée des comptes et des permissions.</p>
        </div>
        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-sm font-bold text-slate-300">
            Total : {filteredUsers.length}
        </div>
      </div>

      <Card className="bg-[#0B1120] border-white/5 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="pb-4 border-b border-white/5 pt-6 px-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Rechercher (Nom, Email, Tel)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-xl py-2.5 pl-10 text-sm focus:border-orange-500 outline-none transition text-white placeholder:text-slate-600"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Filter className="w-4 h-4 text-slate-500 hidden md:block" />
                    {['ALL', 'OWNER', 'TENANT', 'INVESTOR', 'AGENT', 'SUPER_ADMIN'].map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                                roleFilter === role 
                                ? 'bg-orange-500 text-black border-orange-500' 
                                : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10 hover:text-white'
                            }`}
                        >
                            {role === 'ALL' ? 'Tous' : role}
                        </button>
                    ))}
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] text-slate-500 uppercase bg-white/[0.02] font-bold tracking-widest border-b border-white/5">
                        <tr>
                            <th className="p-4 pl-6">Identité</th>
                            <th className="p-4">Rôle</th>
                            <th className="p-4">Wallet</th>
                            <th className="p-4">État</th>
                            <th className="p-4 text-right pr-6">Accès</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition group">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-white flex items-center gap-2 text-sm">
                                        {u.name || "Utilisateur"}
                                        {u.kycStatus === 'VERIFIED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{u.email}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/5 w-fit px-2 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                                        {getRoleIcon(u.role)} {u.role}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-400 font-bold">
                                    {u.walletBalance?.toLocaleString()} F
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase border ${
                                        u.isActive 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                        {u.isActive ? 'ACTIF' : 'BLOQUÉ'}
                                    </span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button 
                                        onClick={() => toggleStatus(u)}
                                        disabled={u.role === 'SUPER_ADMIN'} // On évite de cliquer sur un autre super admin par précaution UX
                                        className={`p-2 rounded-lg transition border ${
                                            u.isActive 
                                            ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-red-500 hover:border-red-500 hover:text-white' 
                                            : 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                                        title={u.isActive ? "Bloquer le compte" : "Réactiver le compte"}
                                    >
                                        {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">Aucun résultat.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
