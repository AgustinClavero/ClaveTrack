import { notFound, redirect } from "next/navigation";
import { getMealDetail } from "@/lib/data/queries";
import { MealDetailView } from "@/components/modules/MealDetailView";

export const dynamic = "force-dynamic";

export default async function MealDetailPage({ params }: { params: { mealId: string } }) {
  const meal = await getMealDetail(params.mealId);
  if (meal === null) {
    // null puede ser "sin sesión" o "no existe": el middleware ya cubre lo primero.
    notFound();
  }
  return <MealDetailView meal={meal} />;
}
