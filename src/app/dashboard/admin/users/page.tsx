"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Ajouté
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Filter, Shield, Ban, CheckCircle, User, Briefcase, Key, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // ✅ FONCTION AUTH (Sécurité)
  const getAdminUser = () => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("immouser");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.role === 'ADMIN' ? user : null;
  };

  const fetchUsers = async () => {
    const admin = getAdminUser();
    if (!admin) { router.push('/login'); return; }

    try {
        // ✅ APPEL SÉCURISÉ
        const res = await api.get('/admin/users', {
            headers: { 'x-user-email': admin.email }
        });
        if (res.data.success) setUsers(res.data.users);
    } catch (error) {
        console.error("Erreur", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Action : Bloquer / Débloquer
  const toggleStatus = async (user: any) => {
    const admin = getAdminUser();
    if (!admin) return;

    const action = user.isActive ? 'Bloquer' : 'Réactiver';
    const color = user.isActive ? '#ef4444' : '#10b981';

    const confirm = await Swal.fire({
        title: `${action} cet utilisateur ?`,
        text: `Utilisateur : ${user.name}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: color,
        confirmButtonText: `Oui, ${action}`,
        background: '#1e293b', color: '#fff'
    });

    if (confirm.isConfirmed) {
        // Simulation Frontend (en attendant le champ DB)
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
        Swal.fire({ icon: 'success', title: 'Mis à jour !', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' });
    }
  };

  // Filtrage
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.phone || "").includes(searchTerm) || 
                          (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Icône selon le rôle
  const getRoleIcon = (role: string) => {
    switch(role) {
        case 'ADMIN': return <Shield className="w-4 h-4 text-purple-500" />;
        case 'OWNER': return <Key className="w-4 h-4 text-orange-500" />;
        case 'AGENT': return <Briefcase className="w-4 h-4 text-blue-500" />;
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
    <div className="min-h-screen bg-[#0B1120] text-white p-6 md:p-8 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-black text-white">UTILISATEURS</h1>
            <p className="text-slate-400 text-sm mt-1">Gérez l'ensemble des comptes de la plateforme.</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-sm font-bold text-slate-300">
            Total : {filteredUsers.length}
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden rounded-2xl">
        <CardHeader className="pb-4 border-b border-slate-800/50 pt-6 px-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                {/* RECHERCHE */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Rechercher (Nom, Email, Tel)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 text-sm focus:border-orange-500 outline-none transition text-white"
                    />
                </div>

                {/* FILTRE RÔLE */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Filter className="w-4 h-4 text-slate-500 hidden md:block" />
                    {['ALL', 'OWNER', 'TENANT', 'AGENT', 'ADMIN'].map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                                roleFilter === role ? 'bg-orange-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
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
                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-950 font-bold tracking-widest">
                        <tr>
                            <th className="p-4 pl-6">Utilisateur</th>
                            <th className="p-4">Rôle</th>
                            <th className="p-4">Wallet</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-800/30 transition group">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-white flex items-center gap-2 text-sm">
                                        {u.name || "Sans Nom"}
                                        {u.kycStatus === 'VERIFIED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{u.email} • {u.phone}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 w-fit px-2 py-1 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                                        {getRoleIcon(u.role)} {u.role}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-slate-400 font-bold">
                                    {u.walletBalance?.toLocaleString()} F
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase border ${u.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                        {u.isActive ? 'ACTIF' : 'BLOQUÉ'}
                                    </span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button 
                                        onClick={() => toggleStatus(u)}
                                        className={`p-2 rounded-lg transition ${u.isActive ? 'bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white' : 'bg-emerald-500 text-white shadow-lg'}`}
                                        title={u.isActive ? "Bloquer l'accès" : "Réactiver le compte"}
                                    >
                                        {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">Aucun utilisateur trouvé.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
