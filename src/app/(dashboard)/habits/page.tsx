import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/data/queries";
import { HabitList } from "@/components/modules/HabitList";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const d = await getDashboard();
  if (!d) redirect("/login");
  if (!d.onboarded) redirect("/onboarding");

  return (
    <section className="screen">
      <div className="screen-title">Hábitos</div>
      <div style={{ marginTop: 14 }}>
        <HabitList initial={d.habits} date={d.date} />
        <p className="note">
          Tocá cualquier hábito para marcarlo. La racha no exige perfección: el día cuenta si superás tu umbral (75%).
        </p>
      </div>
    </section>
  );
}
