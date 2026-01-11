import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from 'sweetalert2';

export function useTenantAlert() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Vérification des paramètres URL
    if (searchParams.get('success') === 'tenant_added' && searchParams.get('new_pass')) {
      const newUser = searchParams.get('new_user');
      const newPhone = searchParams.get('new_phone');
      const newPass = searchParams.get('new_pass');

      // Affichage du popup
      Swal.fire({
        title: '🎉 Locataire Créé !',
        html: `
          <div class="text-left bg-slate-800 p-4 rounded-xl border border-slate-700">
             <p class="mb-2 text-slate-300">Transmettez ces accès à <b>${newUser}</b> :</p>
             <div class="space-y-2">
                 <div class="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                     <span class="text-xs text-slate-500 uppercase font-bold">Identifiant</span>
                     <span class="font-mono text-[#F59E0B] font-bold text-lg select-all">${newPhone}</span>
                 </div>
                 <div class="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                     <span class="text-xs text-slate-500 uppercase font-bold">Mot de passe</span>
                     <span class="font-mono text-white font-bold text-lg tracking-wider select-all">${newPass}</span>
                 </div>
             </div>
             <p class="mt-4 text-xs text-red-400 text-center">⚠️ Copiez-le maintenant !</p>
          </div>
        `,
        icon: 'success',
        background: '#0B1120',
        color: '#fff',
        confirmButtonColor: '#F59E0B',
        confirmButtonText: "C'est noté"
      }).then(() => {
        // Nettoyage de l'URL sans recharger la page
        router.replace('/dashboard/owner', { scroll: false });
      });
    }
  }, [searchParams, router]);
}
