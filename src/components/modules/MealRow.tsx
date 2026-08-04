"use client";

import Link from "next/link";
import Image from "next/image";
import { nf } from "@/lib/utils";

/**
 * Fila de comida del día: la foto manda como miniatura (estilo Cal AI).
 * Toda la fila navega al detalle; borrar vive ahí, no acá.
 */
export function MealRow({
  id,
  label,
  emoji,
  time,
  kcal,
  protein,
  carbs,
  fat,
  photoUrl,
  items,
}: {
  id: string;
  label: string;
  emoji: string;
  time?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl?: string | null;
  items: string[];
}) {
  return (
    <Link href={`/nutrition/${id}`} className="meal-row">
      <div className={`mr-photo${photoUrl ? "" : " empty"}`}>
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="120px" className="mr-img" />
        ) : (
          <span aria-hidden="true">{emoji}</span>
        )}
      </div>

      <div className="mr-main">
        <div className="mr-top">
          <span className="name">{label}</span>
          {time && <span className="time">{time}</span>}
        </div>
        <div className="mr-kcal-row">
          <span aria-hidden="true">🔥</span>
          <b>{nf(kcal)} calorías</b>
        </div>
        <div className="mr-macros">
          <span>
            <i aria-hidden="true">🍗</i> {nf(protein, 0)}g
          </span>
          <span>
            <i aria-hidden="true">🌾</i> {nf(carbs, 0)}g
          </span>
          <span>
            <i aria-hidden="true">🥑</i> {nf(fat, 0)}g
          </span>
        </div>
        {items.length > 0 && <div className="mr-items">{items.join(" · ")}</div>}
      </div>
    </Link>
  );
}
