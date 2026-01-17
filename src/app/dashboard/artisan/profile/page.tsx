"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  User, Phone, MapPin, Briefcase, 
  Save, Loader2, ShieldCheck, Power 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch"; // Assurez-vous d'avoir ce composant ou utilisez un input checkbox standard

export default function ArtisanProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
    address: "",
    isAvailable: false
  });

  // Chargement des données
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/artisan/profile');
        if (res.data) {
            setFormData({
                name: res.data.name || "",
                email: res.data.email || "",
                phone: res.data.phone || "",
                jobTitle: res.data.jobTitle || "",
                address: res.data.address || "",
                isAvailable: res.data.isAvailable || false
            });
        }
      } catch (e) {
        toast.error("Erreur de chargement du profil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Sauvegarde
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
        await api.put('/artisan/profile', formData);
        toast.success("Profil mis à jour avec succès !");
    } catch (e) {
        toast.error("Erreur lors de la sauvegarde.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-mono">Chargement du profil...</p>
      </div>
  );

  return (
    <div className="p-6 md:p-10 text-slate-200 font-sans min-h-screen">
      
      {/* EN-TÊTE */}
      <div className="mb-8">
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <User className="w-8 h-8 text-orange-500" /> Profil & Disponibilité
          </h1>
          <p className="text-slate-400 text-sm">Gérez vos informations publiques et votre statut.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLONNE GAUCHE : IDENTITÉ & STATUS */}
          <div className="space-y-6">
              {/* Carte Identité */}
              <Card className="bg-slate-900 border-slate-800 shadow-lg text-center overflow-hidden relative">
                  <div className="h-24 bg-gradient-to-r from-orange-600 to-orange-400"></div>
                  <div className="absolute top-12 left-1/2 -translate-x-1/2">
                      <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-900 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                          {formData.name.charAt(0)}
                      </div>
                  </div>
                  <CardContent className="pt-16 pb-6">
                      <h2 className="text-xl font-bold text-white">{formData.name}</h2>
                      <p className="text-emerald-500 text-sm font-medium flex items-center justify-center gap-1 mt-1">
                          <ShieldCheck className="w-4 h-4" /> Artisan Vérifié
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-sm">
                          <div>
                              <p className="text-slate-500 text-xs uppercase">Rôle</p>
                              <p className="text-white font-bold">Artisan</p>
                          </div>
                          <div>
                              <p className="text-slate-500 text-xs uppercase">Email</p>
                              <p className="text-white font-bold truncate px-2">{formData.email}</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {/* Carte Disponibilité (Le coeur de la demande) */}
              <Card className={`border-2 transition-all duration-500 ${formData.isAvailable ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900 border-slate-800'}`}>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base text-white">
                          <Power className={`w-5 h-5 ${formData.isAvailable ? 'text-emerald-500' : 'text-slate-500'}`} /> 
                          Statut Actuel
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center justify-between">
                          <span className={`text-lg font-black ${formData.isAvailable ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {formData.isAvailable ? 'EN LIGNE' : 'HORS LIGNE'}
                          </span>
                          
                          {/* Toggle Switch Custom si pas de composant Shadcn */}
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, isAvailable: !formData.isAvailable})}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${formData.isAvailable ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          >
                              <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${formData.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-4">
                          {formData.isAvailable 
                            ? "Vous recevez les notifications de nouvelles missions en temps réel." 
                            : "Vous n'apparaissez plus dans les recherches. Aucune mission ne vous sera proposée."}
                      </p>
                  </CardContent>
              </Card>
          </div>

          {/* COLONNE DROITE : FORMULAIRE DÉTAILS */}
          <div className="lg:col-span-2">
              <Card className="bg-slate-900 border-slate-800 shadow-lg">
                  <CardHeader>
                      <CardTitle className="text-white">Informations Professionnelles</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-5">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                  <Label className="text-slate-400">Métier / Spécialité</Label>
                                  <div className="relative">
                                      <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                      <Input 
                                        value={formData.jobTitle}
                                        onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                                        className="pl-10 bg-black/20 border-slate-700 text-white focus:border-orange-500"
                                        placeholder="Ex: Plombier, Électricien..."
                                      />
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <Label className="text-slate-400">Numéro de téléphone</Label>
                                  <div className="relative">
                                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                      <Input 
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="pl-10 bg-black/20 border-slate-700 text-white focus:border-orange-500"
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label className="text-slate-400">Zone d'intervention (Commune/Quartier)</Label>
                              <div className="relative">
                                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                  <Input 
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className="pl-10 bg-black/20 border-slate-700 text-white focus:border-orange-500"
                                    placeholder="Ex: Cocody, Riviera, Bingerville..."
                                  />
                              </div>
                              <p className="text-[10px] text-slate-500">
                                  Cette adresse permet de vous proposer des missions proches de chez vous.
                              </p>
                          </div>

                          <div className="pt-4 flex justify-end">
                              <Button 
                                type="submit" 
                                disabled={saving}
                                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8"
                              >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  Enregistrer les modifications
                              </Button>
                          </div>

                      </form>
                  </CardContent>
              </Card>
          </div>

      </div>
    </div>
  );
}
