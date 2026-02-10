'use client'

import { useFormState, useFormStatus } from "react-dom";
import { createListingAction } from "../actions"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Palmtree, User } from "lucide-react";
import { User as PrismaUser } from "@prisma/client"; 
import ImageUpload from "@/components/ui/image-upload";

type State = {
  error?: string;
  issues?: any;
} | null;

interface CreateFormProps {
  potentialHosts: Pick<PrismaUser, "id" | "name" | "email" | "image">[];
  currentUserId: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto bg-primary">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création en cours...
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" /> Publier l'annonce
        </>
      )}
    </Button>
  );
}

export default function CreateListingForm({ potentialHosts, currentUserId }: CreateFormProps) {
  const [state, dispatch] = useFormState<State, FormData>(createListingAction, null);

  return (
      <form action={dispatch}>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palmtree className="h-5 w-5 text-orange-500" />
                    Détails de l'annonce
                </CardTitle>
                <CardDescription>
                    Les champs marqués sont obligatoires pour la mise en ligne.
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                
                {/* Message d'erreur */}
                {state?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm font-medium">
                        🚨 {state.error}
                    </div>
                )}

                {/* --- SÉLECTEUR DE PROPRIÉTAIRE (NOUVEAU) --- */}
                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                    <Label htmlFor="hostId" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Propriétaire / Hôte *
                    </Label>
                    <Select name="hostId" defaultValue={currentUserId} required>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un responsable" />
                        </SelectTrigger>
                        <SelectContent>
                            {potentialHosts.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name || user.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        La personne qui recevra les notifications de réservation.
                    </p>
                </div>

                {/* TITRE & PRIX */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="title">Titre de l'annonce *</Label>
                        <Input id="title" name="title" placeholder="Ex: Loft Moderne Zone 4..." required minLength={5} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pricePerNight">Prix / Nuit (FCFA) *</Label>
                        <Input id="pricePerNight" name="pricePerNight" type="number" placeholder="50000" required min={0} />
                    </div>
                </div>

                {/* CONFIGURATION */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="bedrooms">Chambres</Label>
                        <Input id="bedrooms" name="bedrooms" type="number" defaultValue={1} min={0} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bathrooms">Douches</Label>
                        <Input id="bathrooms" name="bathrooms" type="number" defaultValue={1} min={0} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxGuests">Max Invités</Label>
                        <Input id="maxGuests" name="maxGuests" type="number" defaultValue={2} min={1} />
                    </div>
                </div>

                {/* LOCALISATION */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Localisation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">Ville *</Label>
                            <Input id="city" name="city" placeholder="Abidjan" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="neighborhood">Quartier</Label>
                            <Input id="neighborhood" name="neighborhood" placeholder="Marcory" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="address">Adresse précise *</Label>
                            <Input id="address" name="address" placeholder="Rue Pierre et Marie Curie..." required />
                        </div>
                    </div>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description complète *</Label>
                    <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Décrivez l'ambiance, les équipements..." 
                        className="min-h-[120px]" 
                        required 
                        minLength={20}
                    />
                </div>

                {/* GESTIONNAIRE PHOTOS CLOUDINARY */}
                <div className="space-y-2">
                    <Label>Photos (URLs)</Label>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                        <ImageUpload maxFiles={10} />
                </div>     
                </div>

                {/* PUBLICATION */}
                <div className="flex items-center space-x-3 pt-4">
                    <Switch id="isPublished" name="isPublished" defaultChecked />
                    <Label htmlFor="isPublished">Publier immédiatement</Label>
                </div>

            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 flex justify-end">
                <SubmitButton />
            </CardFooter>
        </Card>
      </form>
  );
}
