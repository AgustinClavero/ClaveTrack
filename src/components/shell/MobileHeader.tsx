import { CheckinButton } from "./CheckinButton";
import { NotificationBell } from "./NotificationBell";
import { MobileMenu } from "./MobileMenu";
import type { Insight } from "@/lib/calculations/insights";

export function MobileHeader({ streak, alerts }: { streak: number; alerts: Insight[] }) {
  return (
    <div className="head">
      <div className="hb">
        <div className="logo">C</div>
        <b>ClaveTrack</b>
      </div>
      <div className="head-right">
        <NotificationBell items={alerts} />
        <CheckinButton />
        {/* Último: salir, racha y tema viven en el cajón, son lo menos urgente. */}
        <MobileMenu streak={streak} />
      </div>
    </div>
  );
}
