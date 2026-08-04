import { ThemeToggle } from "./ThemeToggle";
import { STREAK_DAYS } from "@/lib/data/mock";

export function MobileHeader() {
  return (
    <div className="head">
      <div className="hb">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      <div className="head-right">
        <span className="streak-pill">🔥 {STREAK_DAYS}</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
