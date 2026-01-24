'use client';

import { useState } from 'react';
import { createInvestor } from '@/lib/actions/admin';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, UserPlus, Copy, CheckCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function NewInvestorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State pour stocker les identifiants générés temporairement
  const [createdCredentials, setCreatedCredentials] = useState<{email: string | null, password: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        amount: Number(formData.get('amount')),
        packName: formData.get('packName') as string,
    };

    const result = await createInvestor(data);

    if (result.success && result.credentials) {
        toast.success(result.message);
        setCreatedCredentials(result.credentials); // On affiche le résultat
    } else {
        toast.error(result.error || "Une erreur est survenue");
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if(!createdCredentials) return;
    const text = `Bienvenue chez ImmoFacile Invest.\nVoici vos accès :\nEmail: ${createdCredentials.email}\nMot de passe: ${createdCredentials.password}\n\nConnectez-vous sur : https://immofacile.ci/login`;
    navigator.clipboard.writeText(text);
    toast.success("Identifiants copiés !");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/superadmin/investors" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition">
            <ArrowLeft className="w-5 h-5"/>
        </Link>
        <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-[#F59E0B]"/> Nouvel Actionnaire
            </h1>
            <p className="text-slate-500 text-sm">Ajout manuel d'un investisseur Private Equity</p>
        </div>
      </div>

      {/* VIEW 1: SUCCÈS - AFFICHAGE DES IDENTIFIANTS */}
      {createdCredentials ? (
        <div className="bg-[#0B1120] border border-emerald-500/30 p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Compte Créé avec Succès !</h2>
                <p className="text-slate-400 mt-2 text-sm max-w-md">
                    Les fonds ont été ajoutés au registre. Veuillez transmettre ces identifiants sécurisés à l'investisseur <strong>immédiatement</strong>.
                </p>
            </div>

            <div className="bg-[#020617] p-6 rounded-xl border border-white/10 relative group">
                <div className="space-y-4">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Identifiant (Email)</p>
                        <p className="text-white font-mono text-lg select-all">{createdCredentials.email}</p>
                    </div>
                    <div className="h-px bg-white/10"></div>
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Mot de passe généré</p>
                        <div className="flex items-center gap-3">
                            <p className="text-[#F59E0B] font-mono text-xl font-bold select-all tracking-wide">{createdCredentials.password}</p>
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">Unique</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={copyToClipboard}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                    title="Copier tout"
                >
                    <Copy className="w-5 h-5"/>
                </button>
            </div>

            <div className="mt-8 flex gap-4">
                <button 
                    onClick={() => { setCreatedCredentials(null); router.push('/dashboard/superadmin/investors'); }}
                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition"
                >
                    Terminer & Retour
                </button>
                 <button 
                    onClick={() => setCreatedCredentials(null)} // Reset pour en créer un autre
                    className="flex-1 py-4 rounded-xl bg-[#F59E0B] hover:bg-orange-500 text-[#020617] font-bold transition flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4"/> Ajouter un autre
                </button>
            </div>
        </div>
      ) : (
        /* VIEW 2: FORMULAIRE DE CRÉATION */
        <form onSubmit={handleSubmit} className="bg-[#0B1120] p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nom Complet</label>
                    <input required name="name" type="text" placeholder="Ex: Jean Kouassi" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white focus:border-[#F59E0B] outline-none transition font-medium" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Téléphone</label>
                    <input required name="phone" type="tel" placeholder="Ex: 0707..." className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white focus:border-[#F59E0B] outline-none transition font-medium" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email (Identifiant)</label>
                <input required name="email" type="email" placeholder="investisseur@email.com" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white focus:border-[#F59E0B] outline-none transition font-medium" />
            </div>

            <div className="h-px bg-white/5 my-2"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pack Choisi</label>
                    <div className="relative">
                        <select name="packName" className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-white focus:border-[#F59E0B] outline-none transition appearance-none font-medium">
                            <option value="VISIONNAIRE">Pack Visionnaire (Gold)</option>
                            <option value="AMBASSADEUR">Pack Ambassadeur (Blue)</option>
                            <option value="SUPPORTER">Pack Supporter (Red)</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Montant Investi (FCFA)</label>
                    <input required name="amount" type="number" defaultValue={500000} className="w-full bg-[#020617] border border-white/10 rounded-xl p-3 text-[#F59E0B] focus:border-[#F59E0B] outline-none transition font-mono font-bold text-lg" />
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0"/>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Sécurité : Un mot de passe fort sera généré automatiquement. Il ne sera affiché qu'une seule fois à l'étape suivante. Aucune notification email ne sera envoyée (remise en main propre).
                </p>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#F59E0B] hover:bg-orange-500 text-black font-black py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <><Save className="w-5 h-5"/> ENREGISTRER L'INVESTISSEMENT</>}
            </button>
        </form>
      )}
    </div>
  );
}
