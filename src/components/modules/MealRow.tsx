"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteMeal } from "@/app/actions";
import { nf } from "@/lib/utils";

export function MealRow({
  id,
  label,
  emoji,
  time,
  kcal,
  items,
}: {
  id: string;
  label: string;
  emoji: string;
  time?: string;
  kcal: number;
  items: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function remove() {
    startTransition(async () => {
      await deleteMeal({ mealId: id });
      setConfirm(false);
      router.refresh();
    });
  }

  return (
    <div className="meal-row">
      <div className="thumb">{emoji}</div>
      <div className="mr-main">
        <div className="mr-top">
          <span className="name">{label}</span>
          {time && <span className="time">{time}</span>}
        </div>
        <div className="mr-items">{items.join(" · ")}</div>
      </div>
      <div className="mr-kcal">{nf(kcal)} kcal</div>
      {confirm ? (
        <div className="mr-confirm">
          <button className="linkish" onClick={remove} disabled={pending}>
            {pending ? "…" : "Borrar"}
          </button>
          <button className="linkish muted" onClick={() => setConfirm(false)}>
            No
          </button>
        </div>
      ) : (
        <button className="mr-del" onClick={() => setConfirm(true)} aria-label={`Borrar ${label}`}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
