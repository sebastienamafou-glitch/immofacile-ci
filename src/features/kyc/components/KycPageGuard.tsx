import { redirect } from 'next/navigation';
import { auth } from '@/auth'; // L'import magique de la v5
import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

interface KycPageGuardProps {
  children: React.ReactNode;
}

export async function KycPageGuard({ children }: KycPageGuardProps) {
  // Plus besoin de passer authOptions !
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userKyc = await prisma.userKYC.findUnique({
    where: { userId: session.user.id },
    select: { status: true }
  });

  if (!userKyc || userKyc.status !== VerificationStatus.VERIFIED) {
    redirect('/dashboard/kyc/verify');
  }

  return <>{children}</>;
}
