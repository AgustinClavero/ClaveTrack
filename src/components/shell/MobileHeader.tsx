import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";
import { CheckinButton } from "./CheckinButton";

export function MobileHeader({ streak }: { streak: number }) {
  return (
    <div className="head">
      <div className="hb">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      <div className="head-right">
        <span className="streak-pill">🔥 {streak}</span>
        <CheckinButton />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}
