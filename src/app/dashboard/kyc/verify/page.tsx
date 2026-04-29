import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { VerificationStatus } from '@prisma/client';
import { KycUploadForm } from '@/features/kyc/components/KycUploadForm'; // NOUVEL IMPORT

export default async function KycVerifyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const kyc = await prisma.userKYC.findUnique({
    where: { userId: session.user.id }
  });

  if (kyc?.status === VerificationStatus.VERIFIED) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-card text-card-foreground rounded-lg shadow-md border border-border">
      <h1 className="text-2xl font-bold mb-4">Vérification d&apos;Identité Obligatoire</h1>
      
      {kyc?.status === VerificationStatus.PENDING && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md mb-4 border border-yellow-200">
          ⏳ Vos documents sont actuellement en cours d&apos;analyse par nos services.
        </div>
      )}

      {kyc?.status === VerificationStatus.REJECTED && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md mb-4 border border-red-200">
          ❌ Vos documents ont été rejetés. Motif : {kyc.rejectionReason || "Non conforme"}. Veuillez recommencer.
        </div>
      )}

      {(!kyc || kyc.status === VerificationStatus.REJECTED) && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Conformément à la législation ivoirienne sur les transactions immobilières, vous devez fournir une pièce d&apos;identité valide (CNI ou Passeport).
          </p>
          
          {/* L'INTÉGRATION DU NOUVEAU COMPOSANT ICI */}
          <KycUploadForm />
          
        </div>
      )}
    </div>
  );
}
