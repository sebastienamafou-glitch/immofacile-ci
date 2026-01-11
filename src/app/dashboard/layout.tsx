import { AppSidebar } from "@/components/AppSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* La Sidebar est injectée ici, uniquement pour les pages /dashboard/* */}
      <AppSidebar className="w-72 hidden md:flex" />
      
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
