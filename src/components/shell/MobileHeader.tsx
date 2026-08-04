import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { getStreak } from "@/lib/data/queries";

export async function MobileHeader() {
  const streak = await getStreak();
  return (
    <div className="head">
      <div className="hb">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      <div className="head-right">
        <span className="streak-pill">🔥 {streak}</span>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}
