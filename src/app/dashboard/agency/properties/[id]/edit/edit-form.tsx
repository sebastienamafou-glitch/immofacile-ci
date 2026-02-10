'use client'

import { useFormState, useFormStatus } from "react-dom";
import { updatePropertyAction } from "../../actions"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { Property, PropertyType } from "@prisma/client";
import ImageManager from "./image-manager"; // ✅ Import du composant ImageManager

// Définition du type de l'état de retour
type State = {
  error?: string;
  issues?: any;
  success?: boolean;
} | null;

// Composant Bouton Submit (isolé pour gérer le pending state)
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" /> Mettre à jour le mandat
        </>
      )}
    </Button>
  );
}

interface EditFormProps {
  property: Property;
}

export default function EditPropertyForm({ property }: EditFormProps) {
  // Liaison avec la Server Action et l'ID du bien
  const updatePropertyWithId = updatePropertyAction.bind(null, property.id);
  
  // Hook de gestion d'état du formulaire
  const [state, dispatch] = useFormState<State, FormData>(updatePropertyWithId, null);

  return (
    <form action={dispatch}>
      <Card>
        <CardContent className="space-y-6 pt-6">
          
          {/* --- GESTION DES ERREURS --- */}
          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-200">
              {state.error}
            </div>
          )}

          {/* --- SECTION 1 : GESTIONNAIRE D'IMAGES --- */}
          <div className="mb-8 p-4 bg-muted/30 rounded-lg border">
            <ImageManager initialImages={property.images} />
          </div>

          {/* --- SECTION 2 : INFORMATIONS PRINCIPALES --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Titre */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Titre de l'annonce</Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={property.title} 
                required 
                minLength={5}
                placeholder="Ex: Villa Duplex Assinie..."
              />
            </div>

            {/* Prix */}
            <div className="space-y-2">
              <Label htmlFor="price">Loyer / Prix (FCFA)</Label>
              <Input 
                id="price" 
                name="price" 
                type="number" 
                defaultValue={property.price} 
                required 
              />
            </div>

            {/* Type de bien */}
             <div className="space-y-2">
              <Label htmlFor="type">Type de bien</Label>
              <Select name="type" defaultValue={property.type}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PropertyType).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Surface */}
            <div className="space-y-2">
              <Label htmlFor="surface">Surface (m²)</Label>
              <Input 
                id="surface" 
                name="surface" 
                type="number" 
                defaultValue={property.surface?.toString() || ""} 
                placeholder="180"
              />
            </div>

            {/* Configuration (Chambres/Douches) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="bedrooms">Chambres</Label>
                <Input 
                    id="bedrooms" 
                    name="bedrooms" 
                    type="number" 
                    defaultValue={property.bedrooms} 
                    min={0}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="bathrooms">Douches</Label>
                <Input 
                    id="bathrooms" 
                    name="bathrooms" 
                    type="number" 
                    defaultValue={property.bathrooms} 
                    min={0}
                />
                </div>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <Label htmlFor="address">Adresse complète</Label>
              <Input 
                id="address" 
                name="address" 
                defaultValue={property.address} 
                required 
                placeholder="Rue, Quartier, Repère..."
              />
            </div>

            {/* Commune */}
            <div className="space-y-2">
              <Label htmlFor="commune">Commune / Quartier</Label>
              <Input 
                id="commune" 
                name="commune" 
                defaultValue={property.commune} 
                required 
                placeholder="Cocody, Plateau, Marcory..."
              />
            </div>

            {/* Disponibilité */}
            <div className="flex items-center space-x-3 pt-8">
                <Switch id="isAvailable" name="isAvailable" defaultChecked={property.isAvailable} />
                <div className="space-y-0.5">
                    <Label htmlFor="isAvailable">Disponibilité immédiate</Label>
                    <p className="text-xs text-muted-foreground">Activer si le bien peut être loué maintenant.</p>
                </div>
            </div>
          </div>

          {/* --- SECTION 3 : DESCRIPTION --- */}
          <div className="space-y-2 pt-4">
            <Label htmlFor="description">Description publique</Label>
            <Textarea 
              id="description" 
              name="description" 
              defaultValue={property.description || ""} 
              className="min-h-[150px]"
              placeholder="Décrivez les atouts du bien, les commodités à proximité, etc."
            />
          </div>

        </CardContent>

        {/* --- PIED DE PAGE --- */}
        <CardFooter className="flex justify-between border-t bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground hidden md:block">
                Les modifications sont tracées dans l'historique (Audit Log).
            </p>
            <SubmitButton />
        </CardFooter>
      </Card>
    </form>
  );
}
