import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Wallet, CheckCircle } from "lucide-react";
import CinetPayButton from "@/components/ui/CinetPayButton";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// 1. Typage strict
interface InvestPack {
  id: string;
  name: string;
  amount: number;
  rewards: string[];
}

const getPackDetails = (packId: string): InvestPack | null => {
  const packs: Record<string, InvestPack> = {
    "supporter": { id: "supporter", name: "Pack Supporter", amount: 5000, rewards: ["Badge 'Early Believer'", "Remerciement public"] },
    "ambassadeur": { id: "ambassadeur", name: "Pack Ambassadeur", amount: 50000, rewards: ["Accès anticipé Bêta", "3 mois Premium", "Badge Ambassadeur"] },
    "visionnaire": { id: "visionnaire", name: "Pack Visionnaire", amount: 500000, rewards: ["Réunions stratégiques", "Abonnement à vie", "Statut Fondateur"] },
  };
  return packs[packId] || null;
};

interface ConfirmPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ConfirmInvestPage({ searchParams }: ConfirmPageProps) {
  // 1. SÉCURITÉ : Vérification de la session
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/invest");
  }

  const packId = typeof searchParams.pack === "string" ? searchParams.pack : null;
  if (!packId) redirect("/invest");

  const packDetails = getPackDetails(packId);
  if (!packDetails) redirect("/invest");

  // 2. INTENTION DE PAIEMENT : Enregistrement du Transaction ID en BDD
  const transactionId = `TX-INV-${session.user.id}-${Date.now()}`;

  // On cherche un contrat en attente pour le recycler, sinon on le crée
  const existingPendingContract = await prisma.investmentContract.findFirst({
    where: { userId: session.user.id, status: "PENDING" }
  });

  if (existingPendingContract) {
    await prisma.investmentContract.update({
      where: { id: existingPendingContract.id },
      data: { 
        amount: packDetails.amount, 
        packName: packDetails.name, 
        paymentReference: transactionId 
      }
    });
  } else {
    await prisma.investmentContract.create({
      data: {
        userId: session.user.id,
        packName: packDetails.name,
        amount: packDetails.amount,
        paymentReference: transactionId,
        status: "PENDING",
        ipAddress: "PENDING_SIGNATURE",
        signatureData: "PENDING_SIGNATURE"
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-[#F59E0B] selection:text-black pt-32 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        
        <Link href="/invest" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition mb-8 text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Retour aux offres
        </Link>

        <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#F59E0B] border border-white/10">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Confirmation</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Résumé de votre contribution</p>
            </div>
          </div>

          <div className="bg-[#020617] border border-white/5 rounded-2xl p-6 mb-8 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <span className="text-slate-400 font-medium text-sm">Offre sélectionnée</span>
              <span className="text-white font-black uppercase tracking-wide">{packDetails.name}</span>
            </div>
            
            <div>
                <span className="text-slate-400 font-medium text-sm block mb-3">Vos contreparties incluses :</span>
                <ul className="space-y-2">
                    {packDetails.rewards.map((reward, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-slate-300">
                            <CheckCircle className="w-4 h-4 text-[#F59E0B]" /> {reward}
                        </li>
                    ))}
                </ul>
            </div>
          </div>

          <div className="flex justify-between items-end mb-10 border-t border-white/5 pt-6 mt-6">
            <span className="text-lg font-bold text-slate-300">Total à régler</span>
            <div className="text-right">
              <span className="text-4xl font-black text-[#F59E0B]">
                {new Intl.NumberFormat('fr-FR').format(packDetails.amount)}
              </span>
              <span className="text-sm text-slate-500 ml-2 font-bold uppercase">FCFA</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* 3. LIAISON : Le bouton utilise maintenant l'ID enregistré en base */}
            <CinetPayButton 
              amount={packDetails.amount} 
              transactionId={transactionId} 
              description={`Soutien Babimmo - ${packDetails.name}`}
            />
            
            <p className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Transactions sécurisées via Wave & Orange Money
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
