import { redirect } from "next/navigation";
import { getSettingsData } from "@/lib/data/queries";
import { SettingsView } from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const d = await getSettingsData();
  if (!d) redirect("/login");

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Ajustes</h1>
          <p className="screen-sub">Tus objetivos, hábitos y cómo se calcula tu día.</p>
        </div>
      </header>
      <SettingsView data={d} />
    </section>
  );
}
