import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; 
import { jwtVerify } from "jose"; 
import ContractModal from "@/components/invest/ContractModal";
import DashboardView from "@/components/invest/DashboardView";

// --- SÉCURITÉ & DONNÉES ---
async function getAuthenticatedUser() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  // 1. Si pas de token, l'utilisateur n'est pas connecté
  if (!token) return null;

  try {
    // 2. Décryptage du token (Authentification JWT stricte)
    const secretStr = process.env.JWT_SECRET;
    if (!secretStr) throw new Error("CRITIQUE: JWT_SECRET manquant dans l'environnement");
    
    const secret = new TextEncoder().encode(secretStr);
    const { payload } = await jwtVerify(token, secret);
    
    const userId = payload.userId as string;

    // 3. Récupération des données fraîches (Data Fetching)
    // On inclut tout ce dont le Dashboard a besoin pour ne faire qu'une seule requête
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        // A. Pour vérifier la conformité légale
        investmentContracts: {
            orderBy: { signedAt: 'desc' }
        },
        // B. Pour construire le graphique financier
        transactions: {
            orderBy: { createdAt: 'asc' },
            where: {
                OR: [
                    { type: "CREDIT" },
                    { type: "DEBIT" }
                ]
            }
        }
      }
    });

    return user;

  } catch (error) {
    console.error("Erreur Auth Dashboard Invest:", error);
    return null; // Token invalide ou expiré
  }
}

// --- PAGE PRINCIPALE (SERVER COMPONENT) ---
export default async function InvestorPage() {
  // 1. Authentification
  const user = await getAuthenticatedUser();

  // Sécurité : Si pas connecté -> Redirection Login
  if (!user) {
    redirect("/login?type=investor");
  }

  // Sécurité : Vérification du Rôle (Firewall)
  // Seuls les Vrais Investisseurs et le Super Admin passent
  if (user.role !== "INVESTOR" && user.role !== "SUPER_ADMIN") {
     redirect("/dashboard"); // Retour à la maison pour les autres
  }

  // 2. Logique Juridique : Le contrat est-il signé ?
  // On vérifie s'il existe au moins un contrat dans la table dédiée
  const hasSignedContract = user.investmentContracts && user.investmentContracts.length > 0;

  // SCÉNARIO A : PAS DE CONTRAT -> BLOCAGE (MODAL OBLIGATOIRE)
  if (!hasSignedContract) {
    return (
      <ContractModal 
        user={{
            id: user.id,
            name: user.name || "Actionnaire",
            email: user.email || "",
            // Le contrat se base sur le montant actuellement crédité par l'admin
            amount: user.walletBalance, 
            packName: user.backerTier || "Standard"
        }}
        // Callback serveur : Une fois signé, on recharge la page
        onSuccess={async () => { 
          "use server"; 
          redirect('/invest/dashboard'); 
        }} 
      />
    );
  }

  // SCÉNARIO B : TOUT EST OK -> AFFICHAGE DU DASHBOARD
  // On passe l'objet user complet (avec transactions) au composant client
  return <DashboardView user={user} />;
}
