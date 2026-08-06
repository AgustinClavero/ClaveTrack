import { redirect } from "next/navigation";
import { getWork } from "@/lib/data/queries";
import { WorkBoard } from "@/components/modules/WorkBoard";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const d = await getWork();
  if (!d) redirect("/login");

  return (
    <section className="screen">
      <header className="screen-head">
        <div>
          <h1 className="screen-title">Trabajo</h1>
          <p className="page-date">Objetivos, proyectos y tareas</p>
        </div>
      </header>

      <WorkBoard data={d} />
    </section>
  );
}
