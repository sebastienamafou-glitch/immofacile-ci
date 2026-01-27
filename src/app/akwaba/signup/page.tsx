"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, Phone, Palmtree } from "lucide-react";
import Swal from "sweetalert2";

export default function AkwabaSignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/akwaba-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (res.ok) {
        Swal.fire({
            icon: 'success',
            title: 'Bienvenue sur Akwaba !',
            text: 'Votre compte a été créé. Connectez-vous pour réserver.',
            confirmButtonColor: '#F59E0B',
            background: '#020617', color: '#fff'
        }).then(() => {
            // Redirection vers la page de login
            // Idéalement, redirigez vers une page de login spécifique Akwaba si vous en avez une, sinon le login général.
            router.push('/login'); 
        });
      } else {
        Swal.fire({
            icon: 'error',
            title: 'Oups...',
            text: json.error || "Une erreur est survenue.",
            confirmButtonColor: '#F59E0B',
            background: '#020617', color: '#fff'
        });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Erreur Réseau', text: "Impossible de joindre le serveur.", background: '#020617', color: '#fff' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020617]">
      
      {/* COLONNE GAUCHE : VISUEL */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 justify-around items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-blue-900/20 z-10"></div>
        {/* Remplacez par une vraie belle image de villa/plage plus tard */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1570213489059-0aac6626cade?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50 grayscale hover:grayscale-0 transition-all duration-1000 transform hover:scale-105"></div>
        
        <div className="relative z-20 p-12 text-left">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-orange-500/30">
            <Palmtree className="text-white w-8 h-8" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight mb-4">
            Votre prochaine <br/> évasion commence ici.
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Rejoignez Akwaba et accédez aux plus belles résidences pour vos séjours de courte durée en Côte d'Ivoire.
          </p>
        </div>
      </div>

      {/* COLONNE DROITE : FORMULAIRE */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="mt-6 text-3xl font-bold text-white tracking-tight">Créer un compte voyageur</h2>
            <p className="mt-2 text-sm text-slate-400">Rapide, gratuit et sécurisé.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              
              {/* Nom Complet */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input id="name" name="name" type="text" required placeholder="Nom complet"
                  value={formData.name} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input id="email" name="email" type="email" required placeholder="Adresse email"
                  value={formData.email} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

               {/* Téléphone (Optionnel mais recommandé pour Akwaba) */}
               <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-500" />
                </div>
                <input id="phone" name="phone" type="tel" placeholder="Téléphone (optionnel)"
                  value={formData.phone} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Mot de passe */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input id="password" name="password" type="password" required placeholder="Mot de passe (6+ caractères)" minLength={6}
                  value={formData.password} onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

            </div>

            <div>
              <button type="submit" disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent font-bold rounded-xl text-black bg-orange-500 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire et explorer"}
              </button>
            </div>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-slate-400">
              Déjà un compte ?{' '}
              <Link href="/akwaba/login" className="font-medium text-orange-500 hover:text-orange-400 transition-colors">
                Se connecter
              </Link>
            </p>
            <p className="mt-8 text-xs text-slate-500">
                © 2024 Akwaba by ImmoFacile. <br/> Voyagez autrement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
