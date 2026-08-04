import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { BottomNav } from "@/components/shell/BottomNav";
import { RegisterSheet } from "@/components/shell/RegisterSheet";
import { CheckinSheet } from "@/components/shell/CheckinSheet";
import { MealSheet } from "@/components/modules/MealSheet";
import { WeightSheet } from "@/components/modules/WeightSheet";
import { MobileHeader } from "@/components/shell/MobileHeader";
import { getShellData } from "@/lib/data/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const shell = await getShellData();
  if (!shell) redirect("/login");

  return (
    <div className="app">
      <Sidebar streak={shell.streak} />
      <main className="main">
        <MobileHeader streak={shell.streak} />
        {children}
      </main>
      <BottomNav />
      <RegisterSheet />
      <CheckinSheet checkin={shell.checkin} />
      <MealSheet />
      <WeightSheet current={shell.lastWeightKg} />
    </div>
  );
}
