import { Sidebar } from "@/components/shell/Sidebar";
import { BottomNav } from "@/components/shell/BottomNav";
import { RegisterSheet } from "@/components/shell/RegisterSheet";
import { MobileHeader } from "@/components/shell/MobileHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <MobileHeader />
        {children}
      </main>
      <BottomNav />
      <RegisterSheet />
    </div>
  );
}
