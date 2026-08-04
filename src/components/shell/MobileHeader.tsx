import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { CheckinButton } from "./CheckinButton";
import { NotificationBell } from "./NotificationBell";
import type { Insight } from "@/lib/calculations/insights";

export function MobileHeader({ streak, alerts }: { streak: number; alerts: Insight[] }) {
  return (
    <div className="head">
      <div className="hb">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      <div className="head-right">
        <span className="streak-pill">🔥 {streak}</span>
        <NotificationBell items={alerts} />
        <CheckinButton />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}
