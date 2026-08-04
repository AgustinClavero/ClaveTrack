import { getToday } from "@/lib/data/mock";
import { HabitList } from "@/components/modules/HabitList";

export default async function HabitsPage() {
  const { habits } = await getToday();
  return (
    <section className="screen">
      <div className="screen-title">Hábitos</div>
      <div style={{ marginTop: 14 }}>
        <HabitList initial={habits} />
        <p className="note">
          Tocá cualquier hábito para marcarlo. La racha no exige perfección: el día cuenta si superás tu
          umbral (75%).
        </p>
      </div>
    </section>
  );
}
