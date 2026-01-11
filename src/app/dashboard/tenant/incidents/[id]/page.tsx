"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, CheckCircle2, Clock, Wrench, 
  MapPin, Phone, Shield, User, Hammer,
  Calendar, AlertTriangle, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 1. INTERFACES STRICTES
interface Artisan {
  name: string;
  phone: string;
  job?: string; // Optionnel car pas forcément dans User
  location?: string;
}

interface Incident {
  id: string;
  type: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  photos: string[];
  assignedTo?: Artisan | null; // Correspond au backend Prisma
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidentDetails = async () => {
      if (!params.id) return;
      
      try {
        // APPEL API OPTIMISÉ (On appelle la route spécifique créée)
        const res = await api.get(`/tenant/incidents/${params.id}`);
        
        if (res.data.success && res.data.incident) {
          setIncident(res.data.incident);
        } else {
          router.push('/dashboard/tenant/incidents'); // Redirection si introuvable
        }
      } catch (error) {
        console.error("Erreur chargement incident:", error);
        router.push('/dashboard/tenant/incidents');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidentDetails();
  }, [params.id, router]);

  if (loading) return (
    <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
    </div>
  );

  if (!incident) return null;

  // Configuration Timeline
  const steps = [
    { status: 'OPEN', label: 'Signalé', icon: AlertTriangle },
    { status: 'IN_PROGRESS', label: 'Prise en charge', icon: Wrench },
    { status: 'RESOLVED', label: 'Résolu', icon: CheckCircle2 },
  ];

  // Logique pour trouver l'index de l'étape active
  let currentStepIndex = 0;
  if (incident.status === 'IN_PROGRESS') currentStepIndex = 1;
  if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') currentStepIndex = 2;

  return (
    <main className="min-h-screen bg-[#060B18] text-slate-200 p-4 lg:p-10 pb-20 relative font-sans">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="mb-8">
            <button 
                onClick={() => router.push('/dashboard/tenant/incidents')} 
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors group mb-4"
            >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Retour à la liste
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                        {incident.type} <span className="text-slate-600 text-lg not-italic font-normal">#{incident.id.substring(0,8)}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Signalé le {new Date(incident.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'full' })}
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                    incident.status === 'RESOLVED' || incident.status === 'CLOSED'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : incident.status === 'IN_PROGRESS' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                }`}>
                    {incident.status === 'RESOLVED' ? <CheckCircle2 className="w-5 h-5"/> : <Clock className="w-5 h-5"/>}
                    <span className="font-black uppercase tracking-widest text-xs">
                        {incident.status === 'OPEN' ? 'En attente' : incident.status === 'IN_PROGRESS' ? 'En cours' : 'Clôturé'}
                    </span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : DÉTAILS */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. DESCRIPTION */}
                <Card className="bg-[#0F172A] border-white/5 rounded-[2rem] overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Description du problème
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white text-lg leading-relaxed font-medium">
                            "{incident.description}"
                        </p>
                        {incident.photos && incident.photos.length > 0 && (
                            <div className="mt-6 grid grid-cols-3 gap-4">
                                {incident.photos.map((photo, idx) => (
                                    <div key={idx} className="aspect-square bg-slate-800 rounded-xl border border-white/5 bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }}></div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. TIMELINE */}
                <Card className="bg-[#0F172A] border-white/5 rounded-[2rem]">
                    <CardHeader>
                        <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-widest">Suivi d'intervention</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative flex justify-between items-center px-4">
                            <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-800 -z-10 mx-8"></div>
                            <div 
                                className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-orange-500 to-yellow-500 -z-10 mx-8 transition-all duration-1000"
                                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {steps.map((step, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const Icon = step.icon;
                                return (
                                    <div key={idx} className="flex flex-col items-center gap-3 bg-[#0F172A] px-2">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                                            isCompleted 
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' 
                                            : 'bg-slate-900 border-slate-700 text-slate-600'
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                            isCompleted ? 'text-white' : 'text-slate-600'
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* COLONNE DROITE : ARTISAN */}
            <aside className="space-y-6">
                <Card className={`border-2 rounded-[2.5rem] overflow-hidden relative ${
                    incident.assignedTo 
                    ? 'bg-gradient-to-b from-slate-900 to-[#0B1120] border-orange-500/20' 
                    : 'bg-slate-900/50 border-dashed border-slate-700'
                }`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Hammer className="w-4 h-4" /> Intervenant
                        </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-4">
                        {incident.assignedTo ? (
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white mb-4 shadow-xl border-4 border-slate-800">
                                    <User className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-white">{incident.assignedTo.name}</h3>
                                {/* Fallback si pas de job/location dans User */}
                                <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-6">
                                    {incident.assignedTo.job || "Artisan Partenaire"}
                                </p>
                                
                                <div className="space-y-3">
                                    <a href={`tel:${incident.assignedTo.phone}`} className="w-full bg-white text-slate-900 hover:bg-slate-200 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                                        <Phone className="w-4 h-4" /> Appeler
                                    </a>
                                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                        <MapPin className="w-3 h-3" /> {incident.assignedTo.location || "En déplacement"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <Clock className="text-slate-600" />
                                </div>
                                <p className="text-slate-300 font-bold text-sm">En recherche d'artisan...</p>
                                <p className="text-slate-500 text-xs mt-2 px-4">
                                    Le propriétaire a été notifié et va assigner un professionnel sous peu.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="p-6 rounded-[2rem] bg-red-500/5 border border-red-500/10">
                    <h4 className="text-red-500 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Note Importante
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        Si la situation s'aggrave (inondation, danger électrique), coupez les arrivées et contactez les urgences locales ou le gardien de l'immeuble.
                    </p>
                </div>
            </aside>
        </div>
      </div>
    </main>
  );
}
